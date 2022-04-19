//Wizard Init

$("#wizard").steps({
    headerTag: "h3",
    bodyTag: "section",
    transitionEffect: "fade",
    stepsOrientation: "vertical",
    titleTemplate: '<span class="number">#index#</span>'
});


var wizard = $("#wizard")

//Form control

$('[data-step="next"]').on('click', function() {
    wizard.steps('next');
});

$('[data-step="previous"]').on('click', function() {
    wizard.steps('previous');
});

$('[data-step="finish"]').on('click', function() {
    wizard.steps('done');
});

