const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');
const studentRoutes = require('./router/student');

const app = express();
const port = 8000;
const url = 'mongodb://localhost:27017';
const dbName = 'StudentDB';

let db = null;

const connectToDB = async () => {
    const client = new MongoClient(url);
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
    return db;
};

app.use(bodyParser.json());
app.use(cookieParser());

connectToDB().then((database) => {
    app.use((req, res, next) => {
        req.db = database;
        next();
    });

    app.use('/api/student', studentRoutes);

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}).catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
});
