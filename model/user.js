const mongoose = require('mongoose')
const UserSchema = new mongoose.Schema(
	
	{
		usertype: { type: String, required: true },
		id: { type: String, required: true, unique: true },
		first_name: { type: String, required: true },
		middle_name: { type: String },
		last_name: { type: String, required: true },
		suffix: { type: String },
		birthday: { type: String, required: true },
		bio: { type: String },
		sex: { type: String, required: true },
		status: { type: String, required: true },
		phone: { type: String, required: true },
		address: { type: String, required: true },
		phone2: { type: String },
		isVerified: { type: Boolean, default: false },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		date_created: { type: String, required: true },
		img:
		{
			data: Buffer,
			contentType: String
		}
	},
	{ collection: 'users' }
)



const model = mongoose.model('UserSchema', UserSchema)

module.exports = model

