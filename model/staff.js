const mongoose = require('mongoose')
const StaffSchema = new mongoose.Schema(
	{
		usertype: { type: String, required: true },
		id: { type: String, required: true, unique: true },
		first_name: { type: String, required: true },
		middle_name: { type: String },
		last_name: { type: String, required: true },
		suffix: { type: String },
		birthday: { type: String, required: true },
		bio: { type: String, required: true },
		sex: { type: String, required: true },
		status: { type: String, required: true },
		branch: { type: String, required: true },
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
	{ collection: 'staffs' }
)



const staff = mongoose.model('StaffSchema', StaffSchema)

module.exports = staff

