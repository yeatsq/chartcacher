!function(r, document, global) {
	
	r.config({ 
		baseUrl: 'https://usrad-aklprobook:1337/resources/'
	});
	
	r(["assets/object-renderer/object-renderer"], function(renderer) {
		
		function inject() {	
			
			var settings = {
				element: document.getElementById('object-container'),
				layout: global.data,
				localeInfo: {},
				interactive: true
			};
						
			renderer.renderSnapshot(settings).catch(function(error) {
				console.log(error);
			});
		};

		renderer.init({ language: 'en-US' }).then(inject, console.log)
	})
}(require, document, this);