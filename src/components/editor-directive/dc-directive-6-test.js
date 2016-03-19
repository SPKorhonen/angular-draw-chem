describe("DrawChemEditor directive tests - part6", function () {
	beforeEach(module("mmAngularDrawChem"));

	var $scope, element, $rootScope, DrawChem, DrawChemCache, DrawChemShapes, DrawChemStructures, template, styleFull;

	beforeEach(inject(function ($httpBackend, $compile, _$rootScope_, _DrawChem_, _DrawChemCache_, _DrawChemShapes_, _DrawChemStructures_) {
		// configure path for static files
		jasmine.getFixtures().fixturesPath = "base/assets/";
		// load template of the editor
		template = readFixtures("draw-chem-editor-modal.html");

		DrawChem = _DrawChem_;
		DrawChemShapes = _DrawChemShapes_;
		DrawChemStructures = _DrawChemStructures_;
    DrawChemCache = _DrawChemCache_;
		$rootScope = _$rootScope_;

		$scope = $rootScope.$new();
		element = angular.element(
			"<div draw-chem-editor dc-modal></div>"
		);
		temp = $compile(element)($scope);
		$httpBackend
			.expectGET("draw-chem-editor-modal.html")
			.respond(template);
		$scope.$digest();
		$httpBackend.flush();
	}));

  it("should do nothing when delete is performed but no structure exists", function () {
    DrawChem.runEditor("test");
		expect(DrawChem.showEditor()).toEqual(true);
    temp.find("#dc-delete").click();
    temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mousedown",
			which: 1,
			clientX: 200,
			clientY: 120
		});
    temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mouseup",
			which: 1,
			clientX: 200,
			clientY: 120
		});
    expect(temp.find(".dc-editor-dialog-content").html()).toEqual("");
	});

	it("should do nothing when delete is performed, structure is present, but mouseup occurred outside of it", function () {
		var custom = DrawChemStructures.cyclohexane();
    DrawChem.runEditor("test");
		expect(DrawChem.showEditor()).toEqual(true);
		temp.find("#dc-" + custom.name).click();
		temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mouseup",
			which: 1,
			clientX: 100,
			clientY: 100
		});
		expect(temp.find(".dc-editor-dialog-content").html()).toEqual(
      "<svg>" +
        "<g id=\"cmpd1\">" +
          "<style type=\"text/css\">" +
            styleBase + styleExpanded +
          "</style>" +
          "<path d=\"M 98 98 L 115.32 108 L 115.32 128 L 98 138 L 80.68 128 L 80.68 108 L 98 98 \"></path>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"98\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"115.32\" cy=\"108\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"115.32\" cy=\"128\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"138\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"80.68\" cy=\"128\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"80.68\" cy=\"108\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"98\" r=\"2.4\"></circle>" +
        "</g>" +
    "</svg>");
    temp.find("#dc-delete").click();
    temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mousedown",
			which: 1,
			clientX: 200,
			clientY: 120
		});
    temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mouseup",
			which: 1,
			clientX: 200,
			clientY: 120
		});
		expect(temp.find(".dc-editor-dialog-content").html()).toEqual(
      "<svg>" +
        "<g id=\"cmpd1\">" +
          "<style type=\"text/css\">" +
            styleBase + styleExpanded +
          "</style>" +
          "<path d=\"M 98 98 L 115.32 108 L 115.32 128 L 98 138 L 80.68 128 L 80.68 108 L 98 98 \"></path>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"98\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"115.32\" cy=\"108\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"115.32\" cy=\"128\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"138\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"80.68\" cy=\"128\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"80.68\" cy=\"108\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"98\" r=\"2.4\"></circle>" +
        "</g>" +
    "</svg>");
	});

	it("should delete a chosen atom", function () {
		var custom = DrawChemStructures.cyclohexane();
    DrawChem.runEditor("test");
		expect(DrawChem.showEditor()).toEqual(true);
		temp.find("#dc-" + custom.name).click();
		temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mouseup",
			which: 1,
			clientX: 100,
			clientY: 100
		});
    temp.find("#dc-delete").click();
    temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mousedown",
			which: 1,
			clientX: 115,
			clientY: 108
		});
    temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mouseup",
			which: 1,
			clientX: 115,
			clientY: 108
		});
		expect(temp.find(".dc-editor-dialog-content").html()).toEqual(
      "<svg>" +
        "<g id=\"cmpd1\">" +
          "<style type=\"text/css\">" +
            styleBase + styleExpanded +
          "</style>" +
          "<path d=\"M 98 98 \"></path>" +
					"<path d=\"M 115.32 128 L 98 138 L 80.68 128 L 80.68 108 L 98 98 \"></path>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"98\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"115.32\" cy=\"128\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"138\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"80.68\" cy=\"128\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"80.68\" cy=\"108\" r=\"2.4\"></circle>" +
          "<circle class=\"atom\" cx=\"98\" cy=\"98\" r=\"2.4\"></circle>" +
        "</g>" +
    "</svg>");
	});

	it("should delete a chosen arrow", function () {
    DrawChem.runEditor("test");
		expect(DrawChem.showEditor()).toEqual(true);
		temp.find("#dc-one-way-arrow").click();
		temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mouseup",
			which: 1,
			clientX: 100,
			clientY: 100
		});
		expect(temp.find(".dc-editor-dialog-content").html()).toEqual(
      "<svg>" +
        "<g id=\"cmpd1\">" +
          "<style type=\"text/css\">" +
            styleBase + styleExpanded +
          "</style>" +
          "<path class=\"arrow\" d=\"M 98 98 L 118 98 M 115 98 L 115.00 96.70 L 118 98 L 115.00 99.30 Z \"></path>" +
					"<circle class=\"atom\" cx=\"98\" cy=\"98\" r=\"2.4\"></circle>" +
					"<circle class=\"atom\" cx=\"118\" cy=\"98\" r=\"2.4\"></circle>" +
        "</g>" +
    	"</svg>"
		);
    temp.find("#dc-delete").click();
    temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mousedown",
			which: 1,
			clientX: 100,
			clientY: 100
		});
    temp.find(".dc-editor-dialog-content").triggerHandler({
			type : "mouseup",
			which: 1,
			clientX: 100,
			clientY: 100
		});
		expect(temp.find(".dc-editor-dialog-content").html()).toEqual(
			"<svg>" +
				"<g id=\"cmpd1\">" +
					"<style type=\"text/css\">" +
						styleBase + styleExpanded +
					"</style>" +
				"</g>" +
			"</svg>"
		);
	});
});