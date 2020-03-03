var session = new blockstack.UserSession();

function loggedInHandler(profile) {
    var person = new blockstack.Person(profile);
    // console.log(person);

    if (person._profile.username) {
        username.value = person._profile.username;
        document.getElementById("title").innerText += " as " + person._profile.username;
    }
}

function signIn() {
    if (session.isUserSignedIn()) {
        var userData = session.loadUserData();
        loggedInHandler(userData);
    } else if (session.isSignInPending()) {
        session.handlePendingSignIn()
        .then(userData => {
            loggedInHandler(userData);
        })
    } else {
        session.redirectToSignIn(window.location.href);
    }
}

signIn();

  
const video = document.getElementById('video');
const canvas = document.getElementById('video-frame');
const context = canvas.getContext('2d');
const captureButton = document.getElementById('capture-button');

let streaming = false;

navigator.mediaDevices.getUserMedia({
    video: {
        width: 1920,
        height: 1080,
        frameRate: 24,
        facingMode: "environment"
    },
    audio: false
})
    .then(function (stream) {
        video.srcObject = stream;
        video.play();
    })
    .catch(function (err) {
        console.log("An error occurred: " + err);
        alert("An error occurred: " + err);
    });

video.addEventListener('canplay', function (ev) {
    if (!streaming) {
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        streaming = true;
    }
}, false);

captureButton.addEventListener('click', function (ev) {
    ev.preventDefault();

    if (streaming) {
        canvas.width = video.width;
        canvas.height = video.height;
        context.drawImage(video, 0, 0, video.width, video.height);

        document.getElementById("viewfilder-data").value = canvas.toDataURL()

        console.log(canvas.toDataURL())
    } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
}, false);