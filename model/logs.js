const mongoose = require('mongoose')
const LogSchema = new mongoose.Schema(
	{
		usertype: { type: String, required: true },
		id: { type: String, required: true },
		first_name: { type: String, required: true },
		last_name: { type: String, required: true },
		email: { type: String, required: true },
		log_date: { type: String, required: true },
		log_time: { type: String, required: true },
		action: { type: String, required: true },
		branch: { type: String },
	},
	{ collection: 'logs' }
)

const logs = mongoose.model('LogSchema', LogSchema)

module.exports = logs


