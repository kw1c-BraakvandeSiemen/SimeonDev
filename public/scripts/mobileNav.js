/*
    Auteur:         <Siemen van de Braak>
    Aanmaakdatum:   <07-09-2022>

      JS hamburger menu
*/

//waarde declareren
const btn = document.querySelector('.mobileMenuButton');
const menu = document.querySelector('.mobileMenu');

//toggled hidden zodat het wel zichtbaar word on click
btn.addEventListener("click", () => {
    menu.classList.toggle("hidden");
});

//navbar verbergen op 
var prevScrollpos = window.pageYOffset;
window.onscroll = function() {
var currentScrollPos = window.pageYOffset;
  if (prevScrollpos > currentScrollPos) 
  {
    document.getElementById("navbar").style.top = "0";
  } 
  else 
  {
    document.getElementById("navbar").style.top = "-100px";
  }
  prevScrollpos = currentScrollPos;
}