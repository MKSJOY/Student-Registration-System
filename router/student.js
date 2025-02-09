const express = require('express');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');


router.post('/register', async (req, res) => {
    const db = req.db;
    const { name, roll, email, password } = req.body;

    try {
        const existingStudent = await db.collection('students').findOne({ roll });
        if (existingStudent) return res.status(400).json({ error: 'Roll number already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newStudent = { name, roll, email, password: hashedPassword };
        await db.collection('students').insertOne(newStudent);
        res.status(201).json({ message: 'Student registered successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error registering student', err });
    }
});


router.post('/login', async (req, res) => {
    const db = req.db;
    const { roll, password } = req.body;

    try {
        const student = await db.collection('students').findOne({ roll });
        if (!student) return res.status(400).json({ error: 'Student not found' });

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ roll: student.roll }, 'your_jwt_secret', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        res.status(200).json({ message: 'Logged in successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Login error', err });
    }
});


const auth = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret');
        req.roll = decoded.roll;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Token is invalid or expired' });
    }
};

module.exports = auth;



router.get('/profile', auth, async (req, res) => {
    const db = req.db;
    try {
        const student = await db.collection('students').findOne({ roll: req.roll });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.status(200).json(student);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching profile', err });
    }
});


router.put('/update-profile', auth, async (req, res) => {
    const db = req.db;
    try {
        const updatedProfile = await db.collection('students').updateOne(
            { roll: req.roll },
            { $set: req.body }
        );
        res.status(200).json(updatedProfile);
    } catch (err) {
        res.status(500).json({ error: 'Error updating profile', err });
    }
});


router.post('/upload', auth, upload.single('profileImage'), async (req, res) => {
    const db = req.db;
    try {
        await db.collection('students').updateOne(
            { roll: req.roll },
            { $set: { profileImage: req.file.path } }
        );
        res.status(200).json({ message: 'File uploaded successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error uploading file', err });
    }
});



router.get('/file/:filename', auth, (req, res) => {
    const filepath = `uploads/${req.params.filename}`;
    res.sendFile(filepath, { root: '.' });
});



router.delete('/file/:filename', auth, async (req, res) => {
    const db = req.db;
    const filepath = `uploads/${req.params.filename}`;
    try {
        fs.unlinkSync(filepath);
        await db.collection('students').updateOne({ roll: req.roll }, { $set: { profileImage: null } });
        res.status(200).json({ message: 'File deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting file', err });
    }
});



module.exports = router;
