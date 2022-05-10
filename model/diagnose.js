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
		status: { type: String, required: true },
		date_timestamp: { type: String, required: true },
		time_timestamp: { type: String, required: true },
		phone: { type: String },
		phone2: { type: String },
		email: { type: String, required: true },
		pre_diagnose_result: { type: String, required: true },
		exp_symptoms: { type: [String], enum: ["Fever", "Cough", "Difficulty Breathing", "Colds", "Sore Throat"] },
		service: { type: [String], enum: ["Regular Health Checkup", "General Internal Medicine", "Diabetes Care", "Hypertension", "Cardiovascular Diseases", "Ashtma, Ephysemema, Pneumonia", "Adult Pediatric Immunization", "EENT", "Pediatric Wellness", "Anti Rabies Vaccine", "Flu Vaccine"], required: true },
		appointment_status: { type: String, required: true },
		diagnosed_disease: { type: String, required: true },
		medicine: { type: String, required: true },
		laboratory: { type: String, required: true },
		next_checkup: { type: String, required: true },
		next_checkup_note: { type: String },
		notes: { type: String, required: true },
		approved_staff: { type: String },
		diagnosed_doctor: { type: String }
	},
	{ collection: 'diagnosis' }
)



const diagnose = mongoose.model('DiagnoseSchema', DiagnoseSchema)

module.exports = diagnose

