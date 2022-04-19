const mongoose = require('mongoose')
const BranchSchema = new mongoose.Schema(
	{
		id: { type: String, required: true, unique: true },
		branch_name: { type: String, required: true },
		address: { type: String, required: true , unique: true},
		set_time: { type: [String], enum: ["6:00AM","7:00AM","8:00AM","9:00AM","10:00AM","11:00AM","12:00NN","1:00PM","2:00PM","3:00PM","4:00PM","5:00PM","6:00PM","7:00PM","8:00PM","9:00PM"],required: true},
		assigned_doctor: { type: [String], enum: ['Dr 1','Dr 2','Dr 3','Dr 4','Dr 5'], required: true },
		assigned_staffs: { type: [String], enum: ['Staff 1','Staff 2','Staff 3','Staff 4','Staff 5'], required: true },
		phone: { type: Number, required: true },
		img:
		{
			data: Buffer,
			contentType: String
		}
	},
	{ collection: 'branches' }
)



const branch = mongoose.model('BranchSchema', BranchSchema)

module.exports = branch

