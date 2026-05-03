document.getElementById('year').textContent = new Date().getFullYear();

const links = document.querySelectorAll('.nav a');
for (const link of links) {
  link.addEventListener('click', () => {
    links.forEach(item => item.classList.remove('active'));
    link.classList.add('active');
  });
}
