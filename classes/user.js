export default class User {
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
