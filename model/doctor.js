const mongoose = require('mongoose')
const DoctorSchema = new mongoose.Schema(
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
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		img:
		{
			data: Buffer,
			contentType: String
		},
		branch1: { type: String },
		branch2: { type: String },
		start_weekdays1: { type: String },
		end_weekdays1: { type: String },
		start_sat1: { type: String },
		end_sat1: { type: String },
		start_sun1: { type: String },
		end_sun1: { type: String },
		start_weekdays2: { type: String },
		end_weekdays2: { type: String },
		start_sat2: { type: String },
		end_sat2: { type: String },
		start_sun2: { type: String },
		end_sun2: { type: String },
	},
	{ collection: 'doctors' }
)



const doc = mongoose.model('DoctorSchema', DoctorSchema)

module.exports = doc

