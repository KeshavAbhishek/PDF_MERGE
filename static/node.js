function submitForm() {
    document.getElementById("overlap").style.display = "flex";
    setTimeout(() => {
        document.getElementById("overlap").style.display = "none";
        document.getElementById("form").submit();
    }, 5000);
}

document.getElementById("formSub").addEventListener("click", (e) => {
    e.preventDefault();
    submitForm();
})
function displaySelectedFiles() {
    const input = document.getElementById('pdf_files');
    const files = input.files;
    const selectedFilesTable = document.getElementById('selected_files');
    selectedFilesTable.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        const fileSize = file.size;
        const fileRow = document.createElement('tr');
        fileRow.innerHTML = `
    <td>${fileName}</td>
    <td>${fileSize} bytes</td>
    <td><button class="btn btn-danger deleteButton" onclick="deleteFile(this)">Delete</button></td>
    <td><a href='${URL.createObjectURL(file)}' class='link-primary' target="_blank">View</a></td>
`;
        selectedFilesTable.appendChild(fileRow);
    }

    var buttons = document.querySelectorAll(".deleteButton");
    buttons.forEach(element => {
        element.addEventListener("click", (e, button) => {
            e.preventDefault();
            deleteFile(this);
        })
    });
}
function deleteFile(button) {
    const row = button.closest('tr');
    const fileName = row.querySelector('td:first-child').innerText;
    const input = document.getElementById('pdf_files');
    const files = Array.from(input.files);

    // Create a new DataTransfer object
    const dataTransfer = new DataTransfer();

    // Add all files except the one to be deleted to the DataTransfer object
    files.forEach(file => {
        if (file.name !== fileName) {
            dataTransfer.items.add(file);
        }
    });

    // Update the input element with the new FileList
    input.files = dataTransfer.files;

    // Remove the table row
    row.remove();
}