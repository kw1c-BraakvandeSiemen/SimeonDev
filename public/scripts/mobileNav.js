/*
    Auteur:         <Siemen van de Braak>
    Aanmaakdatum:   <07-09-2022>

      JS hamburger menu
*/

//waarde declareren
const btn = document.querySelector(".mobileMenuButton");
const menu = document.querySelector(".mobileMenu");

//toggled hidden zodat het wel zichtbaar word on click
btn.addEventListener("click", () => {
	menu.classList.toggle("hidden");
});

//navbar verbergen op
var prevScrollpos = window.pageYOffset;
window.onscroll = function () {
	var currentScrollPos = window.pageYOffset;
	if (prevScrollpos > currentScrollPos) {
		document.getElementById("navbar").style.top = "0";
	} else {
		document.getElementById("navbar").style.top = "-100px";
	}
	prevScrollpos = currentScrollPos;
	//dont trigger when auto scrolling
	if (prevScrollpos == 0) {
		document.getElementById("navbar").style.top = "0";
	}
	/* disable on ios, had issue with scolling up and bounce back it trigger navbar animation on to fast of a scroll up
  if (navigator.userAgent.match(/(iPod|iPhone|iPad)/))
  {
    document.getElementById("navbar").style.top = "0";
  }
  */
};
