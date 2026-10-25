import prisma from '../config/prisma.config.js'

export default async function(signal, error) {
	console.log(`\nReceive ${signal}, shutting down`)
	if (error) console.error(error)
	try{
		console.log('Prisma disconnect')
		await prisma.$disconnect()
	}catch(err) {
		console.log('Error when disconnect', err)
	}finally{
		process.exit(error ? 1 : 0)
	}
}

