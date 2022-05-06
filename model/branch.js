const mongoose = require('mongoose')
const BranchSchema = new mongoose.Schema(
	{
		id: { type: String, required: true, unique: true },
		branch_name: { type: String, required: true },
		address: { type: String, required: true , unique: true},
		opening_weekdays: { type: String },
		closing_weekdays: { type: String },
		opening_saturday: { type: String },
		closing_saturday: { type: String },
		opening_sunday: { type: String },
		closing_sunday: { type: String },
		phone: { type: String, required: true },
	},
	{ collection: 'branches' }
)



const branch = mongoose.model('BranchSchema', BranchSchema)

module.exports = branch

