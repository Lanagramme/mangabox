var adding = false
function postUser(name){
	$.ajax({
		type: "POST",
		url: "/post/user",
		data: {name: name}
	})        
	.then( res => console.log(res))
}

function postManga(){
	if (adding) return
	adding = true
	let raw = $('#add_manga').val().split('//')
	URL = raw[raw.length -1]
	console.log(URL)
	data = {
		url:  URL.split('/')[0],
		code: URL.split('/')[1]
	}

	$.ajax({
		type: "POST",
		url : "/post/manga",
		data: data
	})
		.then( res => {
			console.log(res)
			alert(res.message)
			if (res.status) {
				initPage([res.manga])
			}
			adding = false
		} )
}

function deleteItem(collection, id) {
	$.ajax({
		type: "DELETE",
		url: `/delete/${collection}/${id}`,
	}).then(res => console.log(res))
}

function update(collection, id, propriete, valeur){
	data = {
		id: id,
		valeur: valeur,
		collection: collection,
		propriete : propriete,
	}

	$.ajax({
		type: "PATCH",
		url: `/patch/${collection}/${id}`,
		data: data
	})
	.then( res => console.log(res) )
}

function getManga(callback){
	$.ajax({
		type: "GET",
		url: `/mangas`,
	})
	.then(res=>callback(res))
}

function initPage(data){
	let template = document.getElementById('template-titre')
	data.forEach(article => {
		const item = template.content.cloneNode(true)
		item.querySelector('img').src = article.art
		item.querySelector('h3').innerText = article.name
		item.querySelector('a').innerText = article.last_chapter
		item.querySelector('a').href = `https://${article.site}/${article.code}`

		document.querySelector('#all').append(item)
	})
}

$('#btn-add_manga').click( (e)=>{
	postManga()
})
getManga(initPage)
