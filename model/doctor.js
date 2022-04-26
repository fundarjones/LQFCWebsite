const mongoose = require('mongoose')
const DoctorSchema = new mongoose.Schema(
	{
		usertype: { type: String, required: true },
		id: { type: String, required: true, unique: true },
		first_name: { type: String, required: true },
		last_name: { type: String, required: true },
		birthday: { type: String, required: true },
		specialization: { type: String, required: true },
		age: { type: String, required: true },
		bio: { type: String, required: true },
		sex: { type: String, required: true },
		status: { type: String, required: true },
		phone: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		img:
		{
			data: Buffer,
			contentType: String
		},
		branch: { type: String, required: true },
	},
	{ collection: 'doctors' }
)



const doc = mongoose.model('DoctorSchema', DoctorSchema)

module.exports = doc

