import { info, debug } from './helpers';
import { showNotice } from './../common/helpers';



const API_URL = edac_editor_app.edacApiUrl;

let HEADERS;
if (typeof (edacp_full_site_scan_app) === 'undefined') {
	HEADERS = edac_editor_app.edacHeaders;
} else {
	HEADERS = edacp_full_site_scan_app.edacpHeaders;
}


const postData = async (url = "", data = {}) => {


	return await fetch(url, {
		method: "POST",
		headers: HEADERS,
		body: JSON.stringify(data),
	}).then((res) => {
		return res.json();
	}).catch(() => {
		return {};
	});

}

const getData = async (url = "") => {

	return await fetch(url, {
		method: "GET",
		headers: HEADERS
	}).then((res) => {
		return res.json();
	}).catch(() => {
		return {};
	});

}



const saveScanResults = (postId, violations) => {

	info('Saving ' + postId + ': started');

	document.querySelector(".edac-panel").classList.add("edac-panel-loading");

	postData(edac_editor_app.edacApiUrl + '/post-scan-results/' + postId, {
		violations: violations
	}).then((data) => {


		info('Saving ' + postId + ': done');

		// Create and dispatch an event to tell legacy admin.js to refresh tabs. Refactor this. 
		var customEvent = new CustomEvent('edac_js_scan_save_complete');
		top.dispatchEvent(customEvent);


		if (!data.success) {

			info('Saving ' + postId + ': error');

			showNotice({
				msg: 'Whoops! It looks like there was a problem updating. Please try again.',
				type: 'warning'
			});

		}

		document.querySelector(".edac-panel").classList.add("edac-panel-loading");

	});


}



const injectIframe = (previewUrl, postID) => {


	// Create an iframe offscreen to load the preview of the page.

	// Gen unique id for this iframe
	const timestamp = new Date().getTime();
	const randomNumber = Math.floor(Math.random() * 1000);
	const uniqueId = 'iframe' + '_' + timestamp + '_' + randomNumber;

	// inject the iframe
	const iframe = document.createElement('iframe');
	iframe.setAttribute('id', uniqueId);
	iframe.setAttribute('src', previewUrl);
	iframe.style.width = screen.width + 'px';
	iframe.style.height = screen.height + 'px';
	iframe.style.position = 'absolute';
	iframe.style.left = '-' + screen.width + 'px';

	document.body.append(iframe);


	// Wait for the preview to load & inject the pageScanner script.
	iframe.addEventListener("load", function (e) {

		// Access the contentDocument of the iframe.
		var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

		// Pass the postID and iframe id into the document so we can reference them from the document.
		const body = iframeDocument.querySelector('body');
		body.setAttribute('data-iframe-id', uniqueId);
		body.setAttribute('data-iframe-event-name', 'edac_scan_complete');
		body.setAttribute('data-iframe-post-id', postID);

	
		if (iframeDocument) {

			// inject the scanner app.
			var scannerScriptElement = iframeDocument.createElement('script');
			scannerScriptElement.src = edac_editor_app.baseurl + '/build/pageScanner.bundle.js';
			iframeDocument.head.appendChild(scannerScriptElement);

		}

	});

}


export const init = () => {

	// Listen for completed scans.
	top.addEventListener('edac_scan_complete', function (event) {

		const postId = event.detail.postId;
		const violations = event.detail.violations;
		const iframeId = event.detail.iframeId;

		// remove the iframe.
		setTimeout(function(){
			document.getElementById(iframeId).remove();
		}, 1000);

		// save the scan results.
		saveScanResults(postId, violations);

	});

	
	//Listen for dispatches from the wp data store so we can trap the update/publish event
	let saving = false;
	let autosaving = false;


	if (wp.data !== undefined && wp.data.subscribe !== undefined) {
		wp.data.subscribe(() => {

			if(wp.data.select('core/editor') === undefined) {
				return;
			}

			if (wp.data.select('core/editor').isAutosavingPost()) {
				autosaving = true;
			}

			// Rescan the page if user saves post
			if (wp.data.select('core/editor').isSavingPost()) {
			
				saving = true;
			} else {
				if (saving) {
					saving = false;

					if (!autosaving) {
						injectIframe(edac_editor_app.scanUrl, edac_editor_app.postID);
					} else {
						autosaving = false;
					}
				}
			}

		});

	} else {
		debug("Gutenberg is not enabled.");
	}



	injectIframe(edac_editor_app.scanUrl, edac_editor_app.postID);



}


