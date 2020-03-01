var signinButton = document.getElementById('signin-button');
var submitButton = document.getElementById('new-button');
var session = new blockstack.UserSession();

signinButton.addEventListener('click', function () {
    if (signinButton.innerText === "Sign Out") {
        blockstack.signUserOut(window.location.origin);
    } else {
        session.redirectToSignIn();
    }
});

submitButton.addEventListener('click', function() {
    if (signinButton.innerText !== "Sign Out") {
        session.redirectToSignIn(window.location.href + "submit");
        event.preventDefault();
    }
})

function loggedInHandler(profile) {
    signinButton.innerText = "Sign Out";

    var usernameDisplay = document.getElementById("username");
    var person = new blockstack.Person(profile);
    if (person._profile.username) {
        usernameDisplay.innerText = person._profile.username;
    } else {
        usernameDisplay.style.display = "none";
    }

    console.log(person);
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
    }
}

signIn();