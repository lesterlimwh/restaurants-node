import axios from 'axios';
import { $ } from './bling';


const defaultMapOptions = {
	center: { lat: 43.6362579, lng: -79.49850909999999 },
	zoom: 10
};

function loadPlaces(map, lat = 43.6362579, lng = -79.49850909999999){
	axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
		.then(res => {
			const places = res.data;
			if(!places.length){
				return;
			}
			// create a bounds
			const bounds = new google.maps.LatLngBounds();
			const infoWindow = new google.maps.InfoWindow();

			const markers = places.map(place => {
				const [placeLng, placeLat] = place.location.coordinates; // creates two variables using array deconstruction
				const position = { lat: placeLat, lng: placeLng };
				bounds.extend(position);
				const marker = new google.maps.Marker({ map, position });
				marker.place = place;
				return marker;
			});

			// show details of marker when clicked
			markers.forEach(marker => marker.addListener('click', function(){
				const html = `
					<div class="popup">
						<a href="/store/${this.place.slug}">
							<img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
							<p>${this.place.name} - ${this.place.location.address}</p>
						</a>
					</div>
				`;
				infoWindow.setContent(html);
				infoWindow.open(map, this); // open the window on the map, at the clicked marker
			}));

			// zoom the map to fit all the markers perfectly
			map.setCenter(bounds.getCenter());
			map.fitBounds(bounds);
		});
}

function makeMap(mapDiv){
	if(!mapDiv) return;
	
	// request for users location otherwise default to MY location (Toronto)
	const mapOptions = {
		center: { lat: 43.6362579, lng: -79.49850909999999 },
		zoom: 10
	};
	navigator.geolocation.watchPosition((data) => {
	  console.log(data.coords);
	  mapOptions.center = { lat: data.coords.latitude, lng: data.coords.longitude };
  }, (err) => {
    // user denied permission to use locations
  });

	// make our map
	const map = new google.maps.Map(mapDiv, defaultMapOptions);
	loadPlaces(map);

	const input = $('[name="geolocate"]');
	const autocomplete = new google.maps.places.Autocomplete(input);
	autocomplete.addListener('place_changed', () => {
		const place = autocomplete.getPlace();
		if(!place.geometry) return;
		loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
	});
}

export default makeMap;
