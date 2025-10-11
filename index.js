import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "blog",
  password: "password",
  port: 5432,
});
db.connect();

let currentUser_id = null;
let currentName = null;

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;
let posts = {};

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());


app.get('/', async (req, res) => {
    try {
        posts = {};
        const result = await db.query(
            `SELECT * FROM blogs`
        );
        if (result) {
        let rows = result.rows;
            for(let runningId = 0; runningId < rows.length; runningId++) {
                let name = rows[runningId].creator_name;
                let title = rows[runningId].title;
                let content = rows[runningId].body;
                let timestamp = rows[runningId].date_created;
                let id = rows[runningId].blog_id;
                let user_id = rows[runningId].creator_user_id;
                posts[runningId] = {
                    id, 
                    name,
                    title,
                    content,
                    timestamp,
                    user_id
                };
            }
        }
    } catch (error) {
        console.error(error);
    }

    const postsArray = Object.values(posts);
    const sortedPosts = postsArray.sort((a, b) => b.timestamp - a.timestamp);

    res.render("index.ejs", {sortedPosts});

});

app.get('/post', (req, res) => {
    res.render("post.ejs", { post: null, editMode: false });
});

app.get('/signin', (req, res) => {
    res.render("signin.ejs");
});

app.get('/signup', (req, res) => {
    res.render("signup.ejs");
});

app.get("/edit/:id", async (req, res) => {

    const { id } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM blogs WHERE blog_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            console.log("Post not found");
            return;
        }
        let post = {
            id: result.rows[0].blog_id,
            name: result.rows[0].creator_name,
            title: result.rows[0].title,
            content: result.rows[0].body,
            timestamp: result.rows[0].date_created,
            user_id: result.rows[0].creator_user_id
        }
        if (result.rows[0].creator_user_id === currentUser_id)
        {
            res.render("post.ejs", { post, editMode: true });
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        console.error(error)
        res.status(500).send("Server error");
    }
});

app.post("/submit", async (req, res) => {
    const {title, content} = req.body;

    try {
        if (currentUser_id == null) {
            res.render('/posts', { error: 'Please Log In Before Posting' });
            return;
        }
        await db.query(
            `INSERT INTO blogs (creator_name, creator_user_id, title, body)
            VALUES ($1, $2, $3, $4)`,
            [currentName, currentUser_id, title, content]
        );
    } catch (error) {
        console.error(error);
        res.render('signup.ejs', { error: 'Something went wrong. Please try again.' });
    }
    res.redirect("/");
});

app.post("/signup", async (req, res) => {
    const {user_id, password, name} = req.body;

    try {
        await db.query(
            `INSERT INTO users (user_id, password, name)
            VALUES ($1, $2, $3)`,
            [user_id, password, name]
            
        );
        res.redirect("/signin")
    } catch (error) {
        console.error(error);
        res.render('signup.ejs', { error: 'That username is already taken. Please try again.' });
    }
    
});

app.post("/signin", async (req, res) => {
    const {user_id, password} = req.body;

    try {
        const result = await db.query(
            `SELECT * FROM users WHERE user_id = $1`,
            [user_id] 
        );

        if (result.rows.length === 0) {
            res.render('signin', {error: 'Username not found.'});
            return;
        }
        if (result.rows[0].password != password) {
            res.render('signin', {error: 'Incorrect Password'});
            return;
        } 

        // at this point they are validated
        currentUser_id = result.rows[0].user_id;
        currentName = result.rows[0].name;

        console.log(
            'Signed in as ' + currentUser_id
        );

    } catch (err) {
        res.render('signin', { error: 'Something went wrong, please try again.' });
    }
    
    res.redirect("/")
});

app.delete("/posts/:id", async (req, res) => {
    const { id } = req.params;
    if (currentUser_id == null) {
        console.log("You must be logged in to delete a post.");
        return 
    }

    try {
        const result = await db.query(
            `DELETE FROM blogs
            WHERE blog_id = $1 AND creator_user_id = $2
            RETURNING *;`,
            [id, currentUser_id]
        );


    } catch (error) {
        console.error(error);
    }
});

app.patch("/posts/:id", async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    if (currentUser_id == null) {
        console.log("You must be logged in to edit a post.");
        return 
    }

    try {
        // Update only if the post belongs to the current user
        const result = await db.query(
            `UPDATE blogs
            SET title = COALESCE($1, title),
            body = COALESCE($2, body),
            date_created = NOW()
            WHERE blog_id = $3 AND creator_user_id = $4
            RETURNING *;`,
            [title, content, id, currentUser_id]
        );


        res.redirect("/")
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});