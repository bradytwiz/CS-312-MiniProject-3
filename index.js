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
let posts = {}
let runningId = 0

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());


app.get('/', (req, res) => {
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

app.get("/edit/:id", (req, res) => {
    const { id } = req.params;
    const post = posts[id];

    res.render("post.ejs", { post, editMode: true });
});

app.post("/submit", async (req, res) => {
    const {title, content} = req.body;

    try {
        if (currentUser_id == null) {
            res.render('/posts', { error: 'Please Log In Before Posting' });
        }
        await db.query(
            `INSERT INTO blogs (creator_name, creator_user_id, title, body)
            VALUES ($1, $2, $3, $4)`
            [currentName, currentUser_id, title, content]
        );
    } catch (error) {
        console.error(err);
        res.render('signup.ejs', { error: 'Something went wrong. Please try again.' });
    }

    posts[runningId] = {
        id: runningId,
        currentName,
        title,
        content,
        timestamp: new Date()
    };
    runningId++;
    res.redirect("/");
});

app.post("/signup", async (req, res) => {
    const {user_id, password, name} = req.body;

    try {
        console.log('hello1');
        await db.query(
            `INSERT INTO users (user_id, password, name)
            VALUES ($1, $2, $3)`,
            [user_id, password, name]
            
        );
        console.log('hello2');
        res.redirect("/signin")
    } catch (err) {
        console.error(err);
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

app.delete("/posts/:id", (req, res) => {
    const { id } = req.params;
    delete posts[id]; 
});

app.patch("/posts/:id", (req, res) => {
    const { id } = req.params;
    const { title, content, name } = req.body;

    const post = posts[id];

    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (name !== undefined) post.name = name;

    post.timestamp = new Date();
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});