const mongoose = require('mongoose')
const AdminSchema = new mongoose.Schema(
	{
		usertype: { type: String, required: true },
		id: { type: String, required: true, unique: true },
		username: { type: String, required: true, unique: true },
		first_name: { type: String, required: true },
		middle_name: { type: String },
		last_name: { type: String, required: true },
		suffix: { type: String },
		birthday: { type: String, required: true },
		age: { type: String, required: true },
		bio: { type: String },
		sex: { type: String, required: true },
		status: { type: String, required: true },
		phone: { type: String, required: true },
		phone2: { type: String },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		img:
		{
			data: Buffer,
			contentType: String
		}
	},
	{ collection: 'admins' }
)



const admin = mongoose.model('AdminSchema', AdminSchema)

module.exports = admin

