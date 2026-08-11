const cookieParser = require('cookie-parser')
const express = require('express')
const dotenv = require('dotenv')

const Pusher = require('pusher')
const {GoogleGenAI} = require('@google/genai')
const {MongoClient, ObjectId} = require('mongodb')
const os = require('os')
const path = require('path')

dotenv.config()

const pusher = new Pusher({
    appId: "2184068",
    key: "0255b92a31b0102b95dc",
    secret: process.env.PUSHER_SECRET,
    cluster: "eu",
    useTLS: true
})
const app = express()
const client = new MongoClient(process.env.MONGO_URL)
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('public'))
app.use(cookieParser())
app.use((req, res, next) => {
    console.log(req.method, req.url)
    next()
})

app.set('view engine', 'ejs')

client.connect().then(() => {
    const tables = client.db('EchoEmpathyEngine').collection('tables')
// gets
    app.get('/', (req, res) => {
        res.render('index')
    })
    app.get('/hall', (req, res) => {
        res.render('hall')
    })
    app.get('/create-table', async (req, res) => {
        const {insertedId} = await tables.insertOne({
            narrators: [
                req.cookies.fullname
            ]
        })
        res.redirect('/table/' + insertedId.toHexString())
    })
    app.get('/table/:id', async (req, res) => {
        const {narrators} = await tables.findOne({_id: new ObjectId(req.params.id)})
        res.render('table', {narrators, tableLink: `http://localhost:3000/table/${req.params.id}`})
    })
// posts
    app.post('/save-name', (req, res) => {
        res.cookie('fullname', req.body.fullname, {maxAge: 1000 * 60 * 60 * 24 * 7})
        res.redirect('/hall')
    })
    app.post('/table', async (req, res) => {
        const id = new URL(req.body.link).pathname.split('/')[2]
        await tables.updateOne({
            _id: new ObjectId(id)
        }, {
            $push: {
                narrators: req.cookies.fullname
            }
        })
        pusher.trigger(
            'my-channel',
            'update-narrators',
            req.cookies.fullname
        )
        res.redirect('/table/' + id)
    })
    app.post('/api/sentence', async (req, res) => {
        const id = new URL(req.body.link).pathname.split('/')[2]
        const {sentence} = req.body
        pusher.trigger(
            'my-channel',
            'update-sentences',
            sentence
        )
        const {output_text} = await ai.interactions.create({
            model: 'gemini-3.1-flash-lite',
            input: `
            from this story
            return a json with 2 properties mood and hexColor
            this is sent as a json api response to client so remove any 
            erring string remove \`\`\`json and \`\`\`:

            ${req.body.sentences.length > 0 ? req.body.sentences : sentence}
            `
        })
        res.send(output_text)
    })
    
    app.listen(3000, () => console.log('http://localhost:3000'))
})