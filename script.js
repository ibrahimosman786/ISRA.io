document.addEventListener('DOMContentLoaded', function () {
    const title = document.querySelector('.title');
    window.setInterval(() => {
        title.style.opacity = (title.style.opacity == 0 ? 1 : 0);
    }, 1000);
});
