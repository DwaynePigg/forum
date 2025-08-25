from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///posts.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


def get_page(number):
	return (number // 10) * 10


class Post(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	username = db.Column(db.String(100), nullable=False)
	number = db.Column(db.Integer, nullable=False)
	content = db.Column(db.Text, nullable=False)
	# html = db.Column(db.Text, nullable=False)
	# access_code = db.Column(db.Integer, nullable=False)
	timestamp = db.Column(db.DateTime, default=datetime.utcnow)
	
	__table_args__ = (db.UniqueConstraint('content', name='unique_content'),)
	
	@property
	def page(self):
		return get_page(self.number)

	def format_time(self):
		return self.timestamp.strftime('%b %d, %Y, %I:%M %p')


@app.route('/')
def index():
	posts = Post.query.order_by(Post.timestamp.desc()).all()
	return render_template('index.html', posts=posts)


@app.route('/create', methods=['POST'])
def create_post():
	data = request.json
	content = data['content']
	new_post = Post(
		username=data['username'], 
		number=data['number'], 
		content=content,
	)
	db.session.add(new_post)
	try:
		db.session.commit()
	except IntegrityError as e:
		db.session.rollback()
		return {
			'message': str(e)
		}, 400
	return {
		'message': 'success',
		'foo': 'bar',
		'weird': {
			'a': 100,
			'b': 200,
		},
	}, 200


@app.route('/delete', methods=['POST'])
def delete_post():
	data = request.json
	post = Post.query.get(data['id'])
	if post is None:
		return {'error': 'no matching post id'}, 404
	db.session.delete(post)
	db.session.commit()
	return {'message': 'success'}, 200


@app.route('/static/<path:filename>')
def custom_static(filename):
	return send_from_directory('static', filename)


@app.errorhandler(500)
def internal_error(error):
	db.session.rollback()
	return render_template('500.html'), 500


with app.app_context():
	db.create_all()

if __name__ == '__main__':
	app.run(debug=True)
