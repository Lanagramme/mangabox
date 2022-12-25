export default class Manga{
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
