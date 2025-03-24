function updateGifImages() {
  const images = document.querySelectorAll(".step_frame");
  images.forEach(function (img) {
    img.addEventListener("click", function () {
      const gifSrc = img.getAttribute("data-gif");
      const pngSrc = img.getAttribute("data-png");
      img.src = gifSrc;

      function checkIfCollapsed() {
        const openModals = document.querySelectorAll("dialog[open]");

        if (openModals?.length == 0) img.src = pngSrc;
        else setTimeout(checkIfCollapsed, 250);
      }

      setTimeout(checkIfCollapsed, 250);

      return true;
    });
  });
}

setTimeout(updateGifImages, 1000);
