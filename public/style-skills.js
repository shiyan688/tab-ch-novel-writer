const link = document.querySelector(".button-link");

link?.addEventListener("click", () => {
  sessionStorage.setItem("novel-editor-open-style-skills", "1");
});
