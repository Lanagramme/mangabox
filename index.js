// IMPORTS
import express from 'express' 
import cors from 'cors'
import { join, dirname } from 'path'
import { Low, JSONFile } from 'lowdb'
import { fileURLToPath } from 'url'
import bodyParser from 'body-parser'
import path from 'path'
import cheerio from 'cheerio'
import axios from 'axios'
// import { data } from 'cheerio/lib/api/attributes'

// CONSTANTS
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)
const app = express()
app.use(cors())

// app.use(bodyParser.json())
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));

const PORT = 4000

// CLASSES
class User {
	constructor(name) {
		this.name = name
		this.id = Date.now()
		this.mangas = []

		this.addManga = function (id, chapter) {
			this.mangas.push({
				id: id, last_chapter_read: chapter
			})
		}
		this.readManga = function (id, chapter) {
			let mangaId = this.chapter.findId(x => x.id == id)
			this.mangas[mangaId].last_chapter_read = chapter
		}
	}
}

class Manga{
  constructor(param){
    this.site = param.site
    this.code = param.code
    this.name = param.name
    this.art = param.art
    this.author = param.author
    this.tags = param.tags
    this.last_update = param.last_update
    this.last_chapter = param.last_chapter
    this.id = Date.now()
  }

  updateManga(last_chapter){
    this.last_update = last_chapter
  }
}

// FUNCTIONS
const DEBUG = (msg) => {
  const debug = true
  debug && console.log("DEBUG => ", msg)
}

async function readAll(res, item){
  await db.read()
  DEBUG(db.data[item])
  return res.json(db.data[item])
}

async function readOne(res, id, collection){
  DEBUG(`Collection:: ${collection}; Item:: ${id}`)
  await db.read()
  const item = db.data[collection].find(x => x.id == id) 
  DEBUG(item ? item : `item not found in collection :: ${collection}`)
  return res.json(item ? item : { error: `item not found in collection :: ${collection}` })
}

async function existInTable(checker ,collection){
  DEBUG(`Check for existence of ${checker.filter} with value ${checker.value} in collection ${collection}`)
  await db.read()
  if (!db.data.hasOwnProperty(collection)) return {status: false, message: `Collection inconnue :: ${collection}`, data : null}
  const bdd = db.data[collection]
  const already_exist = bdd.find(entity => entity[checker.filter] == checker.value)
  DEBUG(`Result of check:: ${!!already_exist}`)

  const status = !!!already_exist
  const message = !!!already_exist
    ? `Le ${checker.filter}: ${checker.value} est libre dans la collection ${collection}`
    : `There is already an entity in the collection ${collection} with the ${checker.filter} ${checker.value}.`
  DEBUG(message)
  return {status: status, message: message, data: already_exist}
}

async function deleteItem(element, collection_name, res) {
  await db.read()
  let collection = db.data[collection_name]
  const element_index = collection.findIndex(x => x.id == element)
  const element_name = collection[element_index].name
  collection = collection.splice(element_index,1)
  await db.write()
  return res.json(`${element_name} supprimé avec succes de la collection ${collection_name}`)
}

// async function updateItem(req, res){
async function updateItem({params: {collection: collection, id: id}, body:{propriete: propriete, valeur: valeur}}, data, res){
  return new Promise(resolve => {
    db.read()
    .then(x => {
      const itemToUpdate = db.data[collection].find(x => x.id == data.id)
  
      console.log(itemToUpdate)
      if (!itemToUpdate.hasOwnProperty(propriete)) 
      return res.json(`L'élément à l'id ${id} de la collection ${collection} ne possede pas de propriété ${propriete}`)
      itemToUpdate[propriete] = valeur
      console.log(itemToUpdate)
      db.write()
      .then(x => {
        resolve('Effectué')
        // return res.json('Effectué')
      })
    })
      
  })
}

async function get_manga(url, code, site){
  const get_meta = (html, $) => {
    const manga_tags   = []
    let manga_author = false

    $('.variations-tableInfo .a-h', html).each(function(){ 
      if (!manga_author) manga_author = $(this).text() 
      else manga_tags.push($(this).text())
    })

    return {
      name: $('.panel-breadcrumb .a-h', html)[1].attribs.title,
      art: $('.story-info-left .img-loading', html)[0].attribs.src,
      author: manga_author,
      site: url,
      code: code,
      tags: manga_tags
    }
  }
  const get_chap = (html, $) => {
    return {
      last_chapter : $('.chapter-name', html)[0].attribs.title,
      last_update  : $('.stre-value', html)[0].children[0].data,
      chapter_list: []
    }
  }

  return new Promise(resolve=> {
    DEBUG('axios')
    const html = site.data
    const $ = cheerio.load(html)
    if ($('.panel-not-found', html).length) resolve({error: "Manga non trouvé"})
    
    const new_manga = new Manga({ 
      ...get_meta(html, $), 
      ...get_chap(html, $) 
    })
    
    db.data.mangas.push(new_manga)
    db.write()
    
    resolve({success: 1, manga: new_manga})
  })
}

async function update_one(item){
  let answ = 0
  function display(item) {
    console.log(item.name)
    console.log('_____________')
  }
  axios(`https://${item.site}/${item.code}`)
  .then(x => {
    const site = x
    db.read()
    .then(()=>{
      const html = site.data
      const $ = cheerio.load(html)
  
      const new_last_update  = $('.stre-value', html)[0].children[0].data
      const new_last_chapter = $('.chapter-name', html)[0].attribs.title
      const nb_chapters = $('.row-content-chapter>.a-h', html).length
  
      display(item)
  
      if ( 
        !item.hasOwnProperty("nb_chapters") 
        || item.last_chapter != new_last_chapter
      ) {
        item.last_chapter = new_last_chapter
        item.last_update  = new_last_update
        item.nb_chapters  = nb_chapters
        console.log('Mise à jour de '+item.name+' effectuée.')
        answ = 1
      } else console.log("À jour.")
      answ++
  
      console.log('======================')
      return {status:1, item: answ}
    })

  })
  .catch(err => { 
    console.log("Erreur de traitement.")
    console.log('======================')
    return {status:0, item: answ} 
  })
}

async function update_base(){
  let treated = 0
  let errors = []
  DEBUG('updating')
  db.read()
  .then(x => {
    for (const item of db.data.mangas) {
      axios(`https://${item.site}/${item.code}`)
      .then(site => {
        // const html = site.data
        // const $ = cheerio.load(html)

        // const new_last_update  = $('.stre-value', html)[0].children[0].data
        // const new_last_chapter = $('.chapter-name', html)[0].attribs.title
        // const nb_chapters = $('.row-content-chapter>.a-h', html).length

        // if (!item.hasOwnProperty("nb_chapters")) item.nb_chapters = $('.row-content-chapter>.a-h', html).length

        // console.log(item.name)
        // console.log(item.nb_chapters + "::" + nb_chapters)
        // // if (item.nb_chapters != nb_chapters) {
        //   item.last_chapter = new_last_chapter
        //   item.last_update  = new_last_update
        //   console.log('mise à jour de '+item.name+' effectuée')
        // // }else {console.log("à jour")}


        // console.log('======================')

        treated++

        if (treated == db.data.mangas.length) {
          db.write()
          console.log('mise à jour de tous les titres effectuée')
          console.log("errors => ", errors)
          return ({message: 'mise à jour effectuée', status: 1})
        }
      })
      .catch(err => {
        // console.log(err)
        db.write()
        console.log('Erreur lors du traitement de ' + item.name)
        if (!item.hasOwnProperty("nb_chapters"))item.nb_chapters = []
        treated++
        errors.push({
          name: item.name,
          site: item.site,
          code: item.code
        })
        if (treated == db.data.mangas.length) {
          console.log('mise à jour de tous les titres effectuée')
          console.log("errors => ", errors)
          return ({message: 'mise à jour de tous les titres effectuée', status: 1})
        }
      })
    }
  })
}

// MIDDLEWARES
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'))
})
app.get('/:directory/:file', (req, res) => {
	res.sendFile(path.join(__dirname, `./public/${req.params.directory}/${req.params.file}`))
})
// app.use('/js', express.static( './code.js'))

app.get('/users', (req, res) => {
  readAll(res, 'users', DEBUG)
})
app.get('/mangas', (req, res, ) => {
  readAll(res, 'mangas', DEBUG)
})

app.get('/user/:id', (req, res) => {
  readOne(res, req.params.id, "users")
})
app.get('/manga/:id', (req, res) => {
  readOne(res, req.params.name, "manga")
})

app.post('/post/user', (req,res) => {
  existInTable({filter: "name", value: req.body.name}, 'users').then(exist => {
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

  existInTable({filter: "code", value: code }, "mangas")
  .then( exist => {
    DEBUG(exist.message)
    if (!exist.status) {
			response.message = exist.message
			return res.json(response)
		}

  axios(`https://${url}/${code}`)
  .then(site => {
    get_manga(url, code, site)
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
  existInTable({filter: 'id', value: req.params.id}, req.params.collection).then(exist => {
    if (exist.data != null) updateItem(req, exist.data, res)
    else if (!exist.status) {return res.json(exist.message)}
  })
})

app.delete('/delete/:collection/:id', (req, res) => {
  existInTable({filter: "id", value: req.params.id }, req.params.collection).then( exist => {
    if (!exist.status) {return res.json(exist.message)}
    deleteItem(req.params.id, req.params.collection, res)
  })

})

app.listen(PORT, () => {
  update_base()
  console.log('Server connected on port ', PORT)
})
