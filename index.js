import config from './config.js';
import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import Ad from './components/Ad.js';
import { Database } from 'sqlite-async';
import Logger from 'simple-node-logger';

let firstTimeRunning = true
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// checks for a log file was already created indicating that the program already ran
if ( fs.existsSync( path.join( __dirname, config.logPath ) ) ) {
	firstTimeRunning = false
}

// create a stdout and file logger
const log = Logger.createSimpleLogger( path.join( __dirname, config.logPath ) );

// check if the SQLite was already created
if ( !fs.existsSync( path.join( __dirname, config.dbPath ) ) ) {
	
	log.info( 'No database found' );

	// creates the database with the needed schema
	createdb()
}
else{
	log.info( 'Database found' );
}

let minPrice, maxPrice;

const main = async() =>{

	log.info('Program started');
	const db = await Database.open( path.join( __dirname, config.dbPath ) );
 
	for( let i=0; i<config.urls.length; i++ ){

		try {

			await scrapper ( config.urls[i] )

		} catch (error) {

	    	throw Error('can not access sqlite database');

		}
	}

	log.info('Program ended');

}

main()


async function scrapper( address ){

	maxPrice = 0
	minPrice = 99999999

	try{

		const response = await axios( address )

		const html = response.data;
	    const $ = cheerio.load(html)
	    const $ads = $('#ad-list li')

		log.info( 'Cheking for new ads at: ' + address );
        log.info( $ads.length + ' ads found' );
        
        let searchTerm = url.parse( address, true )
        searchTerm = searchTerm.query.q

	    for( let i=0; i< $ads.length; i++ )
	    {

	    	const element = $ads[i];

	    	const id      = $(element).find('a').attr('data-lurker_list_id');
	    	const url     = $(element).find('a').attr('href');
	    	const title   = $(element).find('h2').first().text().trim();
			const priceElement = $(element).find('span[color="--color-neutral-130"]').first();
			const priceValue = priceElement.text().replace('R$ ', '').replace('.', '');
	    	const price   = !parseInt( priceValue ) ? 0 : parseInt( priceValue );
	    	const created = new Date().getTime();

	    	// some elements found in the ads selection don't have an url
	    	// I supposed that OLX adds other content between the ads,
	    	// let's clean those empty ads
	    	if( url ){

	    		const result = {
                    id,
		    		url,
		    		title,
		    		price,
		    		created,
                    searchTerm
                }                
				try {	
                    const ad = new Ad( result, firstTimeRunning )

			    } catch ( error ) {

					log.error( 'Could not process this entry' );
			        throw Error( error );
			    }
	    	}
	    }

	} catch( error ){
		log.error( 'Could not fetch the url ' + url );
		throw Error( error );
	}
}

async function createdb() {

	log.info( 'Creating a new database' );
	const db = await Database.open( path.join( __dirname, config.dbPath ) );

	try {

        
	} catch ( error ) {

        log.error( 'Can not access sqlite database' );
	    throw Error( error );
	}

	try {
		
        await db.run(`
	        CREATE TABLE "ads" (
				"id"	        INTEGER NOT NULL UNIQUE,
				"title"	        TEXT NOT NULL,
				"searchTerm"    TEXT NOT NULL,
				"price"	        INTEGER NOT NULL,
				"url"	        TEXT NOT NULL,
				"created"	    INTEGER NOT NULL,
				"lastUpdate"	INTEGER NOT NULL
			)`
		);    

    } catch ( error ) {

        log.error( 'Could not create table' );
        throw Error( error )

    }
}
