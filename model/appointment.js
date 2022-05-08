const mongoose = require('mongoose')
const AppointmentSchema = new mongoose.Schema(
	
	{
		id: { type: String, required: true },
		img_id: { type: String, required: true },
		first_name: { type: String, required: true },
		last_name: { type: String, required: true },
		branch: { type: String, required: true },
		date: { type: String },
		time: { type: String },
		sex: { type: String, required: true },
		birthday: { type: String, required: true },
		status: { type: String, required: true },
		date_timestamp: { type: String, required: true },
		time_timestamp: { type: String, required: true },
		phone: { type: String, required: true },
		email: { type: String, required: true },
		exp_symptoms: { type: [String], enum: ["Fever", "Cough", "Difficulty Breathing", "Colds", "Sore Throat"] },
		service: { type: [String], enum: ["Regular Health Checkup", "General Internal Medicine", "Diabetes Care", "Hypertension", "Cardiovascular Diseases", "Ashtma, Ephysemema, Pneumonia", "Adult Pediatric Immunization", "EENT", "Pediatric Wellness", "Anti Rabies Vaccine", "Flu Vaccine"], required: true },
		pre_diagnose_result: { type: String, required: true },
		appointment_status: { type: String, required: true },
		approved_time: { type: String },
		approved_date: { type: String },
		approved_staff: { type: String },
		time_cancelled: { type: String },
		date_cancelled: { type: String },
		cancelled_by: { type: String },
		isConfirmed: { type: Boolean, default: false },
	},
	{ collection: 'appointments' }
)



const appointment = mongoose.model('AppointmentSchema', AppointmentSchema)

module.exports = appointment

