const mongoose = require('mongoose')
const UserSchema = new mongoose.Schema(
	
	{
		usertype: { type: String, required: true },
		id: { type: String, required: true, unique: true },
		first_name: { type: String, required: true },
		last_name: { type: String, required: true },
		birthday: { type: String, required: true },
		age: { type: String, required: true },
		bio: { type: String, required: true },
		sex: { type: String, required: true },
		status: { type: String, required: true },
		phone: { type: String, required: true },
		isVerified: { type: Boolean, default: false },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
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

