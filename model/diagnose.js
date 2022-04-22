const mongoose = require('mongoose')
const DiagnoseSchema = new mongoose.Schema(
	
	{
		id: { type: String, required: true },
		img_id: { type: String, required: true },
		first_name: { type: String, required: true },
		last_name: { type: String, required: true },
		branch: { type: String, required: true },
		date: { type: String, required: true },
		time: { type: String, required: true },
		sex: { type: String, required: true },
		age: { type: String, required: true },
		status: { type: String, required: true },
		date_timestamp: { type: String, required: true },
		time_timestamp: { type: String, required: true },
		phone: { type: String, required: true },
		email: { type: String, required: true },
		exp_symptoms: { type: String, required: true },
		pre_diagnose_result: { type: String, required: true },
		appointment_status: { type: String, required: true },
		diagnosed_disease: { type: String, required: true },
		medicine: { type: String, required: true },
		laboratory: { type: String, required: true },
		next_checkup: { type: String, required: true },
		next_checkup_note: { type: String },
		notes: { type: String, required: true },
		approved_staff: { type: String },
	},
	{ collection: 'diagnosis' }
)



const diagnose = mongoose.model('DiagnoseSchema', DiagnoseSchema)

module.exports = diagnose

