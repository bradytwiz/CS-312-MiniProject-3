import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";

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

app.post("/submit", (req, res) => {
    const {name, title, content} = req.body
    posts[runningId] = {
        id: runningId,
        name,
        title,
        content,
        timestamp: new Date()
    };
    runningId++;
    res.redirect("/");
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