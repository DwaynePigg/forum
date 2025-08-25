function submitPost() {
	let content = document.getElementById('postInput').value;
	fetch('/create', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'}, 
		body: JSON.stringify({
			number: 42,
			username: 'testuser',
			content: content,
		})
	}).then(res => res.json()).then(function(result) {
		document.getElementById('results').appendChild(objectToTable(result));
	}).catch(function (error) {
		alert(error);
	});
}

function objectToTable(obj) {
	let table = document.createElement('table');
	for (let [key, value] of Object.entries(obj)) {
		let row = table.insertRow();
		let cellKey = row.insertCell();
		cellKey.textContent = key;
		let cellValue = row.insertCell();
		if (typeof value === 'object' && value !== null) {
			cellValue.appendChild(objectToTable(value));
		} else {
			cellValue.textContent = value;
		}
	}
	return table;
}

function deletePost(id) {
	fetch('/delete', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'}, 
		body: JSON.stringify({
			id: id,
			accessCode: '666',
		})
	}).then(res => res.json()).then(function(result) {
		document.getElementById('results').appendChild(objectToTable(result));
	}).catch(function (error) {
		alert(error);
	});
}
