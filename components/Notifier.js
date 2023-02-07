'use strict';

import config from  '../config.js' ;
import axios from 'axios';

export const sendNotification = async ( msg ) => {
		msg = encodeURI(msg)

		try {
			return await axios.get('https://api.telegram.org/bot' + config.telegramToken + '/sendMessage?chat_id=' + config.telegramChatID + '&text=' + msg )
		} catch ( error ) {
			//log.error('Error sending the Telegram message');
			throw Error( error );

		}
	};