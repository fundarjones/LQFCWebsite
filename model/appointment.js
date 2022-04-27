const mongoose = require('mongoose')
const AppointmentSchema = new mongoose.Schema(
	
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
		birthday: { type: String, required: true },
		status: { type: String, required: true },
		date_timestamp: { type: String, required: true },
		time_timestamp: { type: String, required: true },
		phone: { type: String, required: true },
		email: { type: String, required: true },
		exp_symptoms: { type: [String], enum: ['Headache', 'Fever', 'Cough', 'Tiredness', 'Loss of Taste or Smell', 'Sore Throat', 'Aches and Pains', 'Diarrhoea', 'Shortness of breath',"Vomiting","Cognitive Impairment","Confusion","Decline in memory or other thinking skills","Memory Loss","Sore Eye","Nose bleed","Itchy Throat","Neck hurts","Colds","Sore Eye","Nausea","Reflux","Stomach pain lower left side","Stomach pain lower right side","Blood in urine","Difficult to pee","Genital pain","Chills","Anxiety","Fatigue","Self injury","Wound","Shaking","Nervousness","Anal bleeding","Constipation","Nausea","Other symptoms.."], required: true },
		symptoms_detected: { type: String, required: true },
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

