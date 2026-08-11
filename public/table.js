// import Pusher from "pusher-js"

const pusher = new Pusher("0255b92a31b0102b95dc", {cluster: "eu"})
const narrators = []
const sentences = []

pusher.subscribe('my-channel')
pusher.bind('update-narrators', data => {
    narrators.push(data)
    document.querySelector(".narrators-list").innerHTML += `
    <li>${narrators[narrators.length - 1]}</li>
    `
})
pusher.bind('update-sentences', data => {
    sentences.push(data)
    document.querySelector(".story").innerHTML += `
    <li>${sentences[sentences.length - 1]}</li>
    `
})
pusher.bind('update-mood', data => {
    document.querySelector(".mood").innerHTML = `
    <li>${data}</li>
    `
})

window.addEventListener('pagehide', () => {
    pusher.unbind('update-narrators')
    pusher.disconnect()
})

document.querySelector('.sentence-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const payload = {sentence: formData.get('sentence'), link: formData.get('link'), sentences}
    fetch('/api/sentence', {method: 'post', headers: {'content-type': 'application/json'}, body: JSON.stringify(payload)}).then(res => res.text()).then(data => {
        // console.log(data)
        const {mood, hexColor} = JSON.parse(data)
        document.querySelector('.mood').innerHTML = mood
        document.querySelector('.mood-color').style.backgroundColor = hexColor   
    })
    e.target.reset()
})
document.querySelector('.copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(document.querySelector('.table-link').innerHTML)
})