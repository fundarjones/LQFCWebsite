const mongoose = require('mongoose')
const BranchSchema = new mongoose.Schema(
	{
		id: { type: String, required: true, unique: true },
		branch_name: { type: String, required: true },
		address: { type: String, required: true , unique: true},
		set_time: { type: [String], enum: ["6:00AM","7:00AM","8:00AM","9:00AM","10:00AM","11:00AM","12:00NN","1:00PM","2:00PM","3:00PM","4:00PM","5:00PM","6:00PM","7:00PM","8:00PM","9:00PM"],required: true},
		phone: { type: String, required: true },
	},
	{ collection: 'branches' }
)



const branch = mongoose.model('BranchSchema', BranchSchema)

module.exports = branch

