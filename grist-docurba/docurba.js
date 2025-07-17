let urlAPI = 'https://nuxt3.docurba.incubateur.net/api/urba/exports/communes'; //?code=31001 | ?departementCode=31
let tableId = null; // id de la table source (voir les options de la vue)
let selectedRowId = null; let selectedRecord = null;
let allRecords = null;
let colMappings = null; //let selectedMaps = null;
let traitement = false; // indique si la mise à jour est en cours d'exec
let erreurs = ''; // Pour faire remonter les erreurs

grist.ready({ requiredAccess:'full',
	/* Permet au user de désigner la colonne avec le code Insee des communes : */
	columns: [ { name:'insee', title:"Code Insee de la commune", description:"Choisir la colonne avec le code Insee"} ]
});

/* Seulement pour trouver les infos de la table : */
grist.onRecords( async (records, mappings) => { /* A FINIR ! */
	if( allRecords ) return;
	allRecords = records;
	
	/* !!!! il FAUT vérifier que la table liée est bien DOCURBA, avec les bonnes colonnes !  */
	
	colMappings = mappings; //selectedMaps = grist.mapColumnNames(records);
	let cetteTable;
	if( !tableId ){
		cetteTable = await grist.getTable();
		tableId = await cetteTable._platform.getTableId();
	}
});


function arreter(){ /* Pour stopper la MAJ en cours */
	traitement = false;
}


/* MAJ les données en interrogeant l'API Docurba (pour chaque ligne de la table) */
async function majTable(){
	if( traitement ) return; // MAJ déjà lancée précédemment
	traitement = true;
	let divurba = document.getElementById('docurba');
	let divavct = document.getElementById('avancement');
	if( !allRecords ){ divurba.innerHTML = "Aucune ligne trouvée dans DOCURBA !"; return }
	if( tableId ) divavct.innerHTML = "Table source : "+tableId;
	else { divurba.innerHTML = "La table des données source est absente !"; return }
	if( colMappings && colMappings.insee ) divavct.innerHTML = "<br>Colonne code Insee : "+colMappings.insee;
	else { divurba.innerHTML = "La colonne code Insee est absente !"; return }
	erreurs = '';
	//divurba.innerHTML = "allRecords :<br>"+ JSON.stringify(allRecords,null,2);
	//divurba.innerHTML += "<br><br>colMappings : "+ JSON.stringify(colMappings,null,2);
	//divavct.innerHTML = "selectedMaps :<br>"+ JSON.stringify(selectedMaps,null,2);
	divurba.innerHTML = "<br>j'interroge DOCURBA...<br>";
	divavct.innerHTML = "";
	let chInsee = colMappings.insee; // Nom du champ de la table
	for( let record of allRecords ){
		if( !traitement ){
			divurba.innerHTML = "<br> ------ Vous avez interrompu la mise à jour ------ <br>";
			return;
		}
		let insee = record[chInsee];
		divavct.innerHTML += "<br>"+insee+" : j'interroge DOCURBA...";
		let texte = await fetchCSV(urlAPI +'?code='+ insee);
		if( !texte ){
			divavct.innerHTML += " : <b>Problème réseau vers l'API Docurba :</b><br>"+erreurs;
			continue
		}
		let urba = csvToJSON(texte); //let urba = await fetchCSV(urlAPI + insee);
		if( urba && urba.length==1 ) urba = urba[0]; // urba: {annee_cog:"2024", code_insee:"31001",...}
		else {
			divavct.innerHTML += " : <b>Problème avec les données de l'API Docurba !</b><br>"+texte;
			return;
		}
		try {
			await grist.docApi.applyUserActions([["UpdateRecord",tableId,record.id,urba]]);
			divavct.innerHTML += ": OK : "+ urba['plan_libelle_code_etat_simplifie'];
		} catch(error){
			divavct.innerHTML += " : ECHEC de la mise à jour de la ligne ! "+ error.message;
			console.error('Error fetching CSV:', error);
		}
	}
	divurba.innerHTML = "============ FIN ============ <br>";
}



/* Mettre à jour la table source en interrogeant l'API Docurba une seule fois (tout le 31) */
async function majTable_dep(){
	let divurba = document.getElementById('docurba');
	let divavct = document.getElementById('avancement');
	if( !allRecords ){ divurba.innerHTML = "Aucune ligne trouvée dans DOCURBA !"; return }
	if( tableId ) divavct.innerHTML = "Table source : "+tableId;
	else { divurba.innerHTML = "La table des données source est absente !"; return }
	if( colMappings && colMappings.insee ) divavct.innerHTML = "<br>Colonne code Insee : "+colMappings.insee;
	else { divurba.innerHTML = "La colonne code Insee est absente !"; return }
	erreurs = '';
	divurba.innerHTML = "1. j'interroge DOCURBA...<br>";
	let texte = await fetchCSV(urlAPI +'?departementCode=31');
	if( !texte ){
		divurba.innerHTML = "<br><b>Problème réseau vers l'API Docurba :</b><br>"+erreurs;
		return 
	}
	divurba.innerHTML += "<br>2. je prépare les données reçues<br>";
	divavct.innerHTML = "";
	let urba = csvToObjet( texte, ',', 'code_insee' )
	if( !urba ){
		divurba.innerHTML = "<br><b>Problème avec les données de l'API Docurba !</b> voir ci-dessous<br>";
		divavct.innerHTML = texte;
		return;
	}
	divurba.innerHTML += "<br>3. je mets à jour la table DOCURBA...<br>";
	let nbErreurs = 0; // Compter les erreurs : si 10 erreurs, arrêter le traitement
	let today = new Date();  let jour = today.toISOString().substring(0,10);
	let chInsee = colMappings.insee; // Nom du champ de la table
	for( let record of allRecords ){
		let insee = record[chInsee];
		let li = document.createElement("p");
		if( urba[insee]==undefined ){  nbErreurs += 1;
			li.innerText = "! "+insee+" pas trouvé sur Docurba";
			divavct.appendChild(li);
			if( nbErreurs<10 ){ continue } else { break }
		}
		let update = urba[insee];
		try {
			update['com_nom_departement'] = jour; // Date de la mise à jour
			await grist.docApi.applyUserActions([["UpdateRecord",tableId,record.id,update]]);
			li.innerText = "-- "+insee+" : OK : "+ update['plan_libelle_code_etat_simplifie'];
			divurba.innerHTML += ".";
		} catch(error){  nbErreurs += 1;
			li.innerHTML = "! "+insee+" : ECHEC de la mise à jour de la ligne ! "+ error.message;
			console.error('UpdateRecord Error :', error);
		}
		divavct.appendChild(li);
		if( nbErreurs==10 ) break;

	}
	divurba.innerHTML += "<br>============ FIN ============ <br>";
}


/* Récup les données depuis une API CSV (texte) */
async function fetchCSV(url){
	try {
		const response = await fetch(url);
		const data = await response.text();
		return data;
	} catch(error){
		console.error('Error fetching CSV:', error);
		erreurs = 'Error fetching CSV : '+error.message;
		return false;
	}
}


/* Convertir un csv (texte) en objet JS : { {col1:"val",col2:"val"...},{col1:...} } */
function csvToObjet( strData, strDelimiter, champRef ){
	strDelimiter = (strDelimiter || ","); // If the delimiter is defined else default to comma
	// Create a regular expression to parse the CSV values.
	var objPattern = new RegExp(
		( // Delimiters:
			"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
			// Quoted fields:
			"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
			// Standard fields:
			"([^\"\\" + strDelimiter + "\\r\\n]*))"
		), "gi" );
	// Create an array to hold our data. Give the array a default empty first row:
	var arrData = [[]];
	var arrMatches = null; // To hold our individual pattern matching groups
	let objFinal = {} ; //let jsonTab = [];
	let numli = 0;  let numcol = 0;  let nomcols = []; dataLigne = {};  let colRef = false;
	// Keep looping over the regular expression matches until we can no longer find a match:
	while( arrMatches = objPattern.exec( strData ) ){
		var strMatchedDelimiter = arrMatches[ 1 ];// Get the delimiter that was found
		// Check to see if the given delimiter has a length (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know that this delimiter is a row delimiter.
		if ( strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter ){//Si c'est une new ligne
			// Since we have reached a new row of data, add an empty row to our data array:
			if( numli>0 ){
				if( colRef ) objFinal[ dataLigne[champRef] ] = dataLigne;
				else  objFinal[ numli ] = dataLigne; // Si champRef n'a pas été trouvé dans les cols du cv
				dataLigne = {}; // Prépare la ligne suivante
			}
			numli += 1; // Changer le numéro de la ligne actuelle
			numcol = 0;
		}
		let strMatchedValue;
		// We have our delimiter so let's check to see which kind of value we captured (quoted or unquoted).
		if( arrMatches[2] ){ // We found a quoted value. When we capture this value, unescape any double quotes
			strMatchedValue = arrMatches[2].replace(new RegExp( "\"\"", "g" ),"\"");
		} else { // We found a non-quoted value.
			strMatchedValue = arrMatches[3];
		}
		//console.log(numli, numcol, strMatchedValue);
		// Si c'est la 1ere ligne, enregistrer comme noms de colonnes dans nomcols :
		if( numli==0 ){
			nomcols.push(strMatchedValue);
			if( strMatchedValue==champRef ) colRef = true;//Marquer que la col champRef a été trouvée
		}
		// Pour les lignes suivantes, enregistrer dans jsonTab (ligne actuelle) par son nomcols :
		else  dataLigne[ nomcols[numcol] ] = strMatchedValue;
		numcol += 1;
	}
	console.log( dataLigne );
	/* enregistrer la dernière ligne : */
	if( colRef ) objFinal[ dataLigne[champRef] ] = dataLigne;
	else  objFinal[ numli ] = dataLigne; // Si champRef n'a pas été trouvé dans les cols du cv
	return objFinal;
}
