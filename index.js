// IMPORTS
import express from 'express' 
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import bodyParser from 'body-parser'
import path from 'path'
import axios from 'axios'
import User from "./classes/user.js"
import { DEBUG } from "./modules/debug.js"
import * as DATA from "./modules/data.js"

// CONSTANTS
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));

const PORT = 4000

// MIDDLEWARES
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'))
})
app.get('/:directory/:file', (req, res) => {
	res.sendFile(path.join(__dirname, `./public/${req.params.directory}/${req.params.file}`))
})
app.get('/users', (req, res) => {
  DATA.readAll(res, 'users', DEBUG)
})
app.get('/mangas', (req, res, ) => {
  DATA.readAll(res, 'mangas', DEBUG)
})
app.get('/user/:id', (req, res) => {
  DATA.readOne(res, req.params.id, "users")
})
app.get('/manga/:id', (req, res) => {
  DATA.readOne(res, req.params.name, "manga")
})
app.post('/post/user', (req,res) => {
  DATA.existInTable({filter: "name", value: req.body.name}, 'users').then(exist => {
    if (!exist.status) return res.json(exist.message)
    db.data.users.push(new User(req.body.name))
    db.write()
    return res.json(`User ${req.body.name} ajouté`)
  })
})

app.post('/post/manga', (req,res) => {
  const requiredParams = ['code', 'url']
	const response = { status:0 }
  DEBUG(req.body)
  for (let param of requiredParams) {
    if (!req.body[param]) { return res.json(`Missing parameter :: ${param}`)}
  }
  const [code, url] = [req.body.code, req.body.url]

  DATA.existInTable({filter: "code", value: code }, "mangas")
  .then( exist => {
    DEBUG(exist.message)
    if (!exist.status) {
			response.message = exist.message
			return res.json(response)
		}

  axios(`https://${url}/${code}`)
  .then(site => {
    DATA.get_manga(url, code, site)
    .then(R => {
      console.log(R)
      if (R.hasOwnProperty("success")){
        console.log(`${R.manga.name} à été ajouté.`)
        res.json({
          message : `${R.manga.name} à été ajouté.`,
          manga   : R.manga,
          status  : 1 
        })
      }
      else if (R.hasOwnProperty("error")) {
        console.log('Manga non trouvé')
        res.json({ 
          error: 'Manga non trouvé', 
          message: 'Manga non trouvé', 
          status : 0
        })
      }
      else {
        console.log('site non trouvé')
        res.json({ 
          error: 'site non trouvé', 
          message: 'site non trouvé', 
          status : 0
        })
      }
    })
  }).catch(err => res.json({error: "site non trouvé"}))
    
  })
})

app.patch('/patch/:collection/:id', (req,res) => {
  DATA.existInTable({filter: 'id', value: req.params.id}, req.params.collection).then(exist => {
    if (exist.data != null) updateItem(req, exist.data, res)
    else if (!exist.status) {return res.json(exist.message)}
  })
})

app.delete('/delete/:collection/:id', (req, res) => {
  DATA.existInTable({filter: "id", value: req.params.id }, req.params.collection).then( exist => {
    if (!exist.status) {return res.json(exist.message)}
    deleteItem(req.params.id, req.params.collection, res)
  })

})

app.listen(PORT, () => {
  // update_base()
  console.log('Server connected on port ', PORT)
})
