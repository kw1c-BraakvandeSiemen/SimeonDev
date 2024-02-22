/*
    Auteur:         <Siemen van de Braak>
    Aanmaakdatum:   <20-09-2022>

      Lees verder
*/

function readMore() {
	//waarde declareren
	var more = document.getElementById("more");
	var knop = document.getElementById("knop");
	//als de waarde van de class "transform opacity-0" is dan veranderd hij naar "transform opacity-100"
	if (more.className === "h-0 transform opacity-0 transition-all duration-500") {
		more.className = "h-96 transform opacity-100 transition-all duration-500";
		knop.innerHTML = 'Read less<svg class="mt-0.5 ml-1 -mr-1 stroke-gray-300 stroke-2" fill="none" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path class="opacity-0 transition group-hover:opacity-100" d="M0 5h7"></path></svg>';
	} else {
		//anders veranderd hij naar "transform opacity-0"
		more.className = "h-0 transform opacity-0 transition-all duration-500";
		knop.innerHTML = 'Read more<svg class="mt-0.5 ml-1 -mr-1 stroke-gray-300 stroke-2" fill="none" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path class="opacity-0 transition group-hover:opacity-100" d="M0 5h7"></path><path class="transition group-hover:translate-x-[3px]" d="M1 1l4 4-4 4"></path></svg>';
	}
}

function readMore2() {
	//waarde declareren
	var more2 = document.getElementById("more2");
	var knop2 = document.getElementById("knop2");
	//als de waarde van de class "transform opacity-0" is dan veranderd hij naar "transform opacity-100"
	if (more2.className === "h-0 transform opacity-0 transition-all duration-500") {
		more2.className = "h-96 transform opacity-100 transition-all duration-500";
		knop2.innerHTML = 'Read less<svg class="mt-0.5 ml-1 -mr-1 stroke-gray-300 stroke-2" fill="none" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path class="opacity-0 transition group-hover:opacity-100" d="M0 5h7"></path></svg>';
	} else {
		//anders veranderd hij naar "transform opacity-0"
		more2.className = "h-0 transform opacity-0 transition-all duration-500";
		knop2.innerHTML = 'Read more<svg class="mt-0.5 ml-1 -mr-1 stroke-gray-300 stroke-2" fill="none" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path class="opacity-0 transition group-hover:opacity-100" d="M0 5h7"></path><path class="transition group-hover:translate-x-[3px]" d="M1 1l4 4-4 4"></path></svg>';
	}
}
