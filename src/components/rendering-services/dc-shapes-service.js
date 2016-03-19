(function () {
	"use strict";
	angular.module("mmAngularDrawChem")
		.factory("DrawChemShapes", DrawChemShapes);

	DrawChemShapes.$inject = [
		"DCShape",
		"DrawChemConst",
		"DrawChemUtils",
		"DCAtom",
		"DCBond",
		"DCArrow",
		"DCSelection"
	];

	function DrawChemShapes(DCShape, Const, Utils, DCAtom, DCBond, DCArrow, DCSelection) {

		var service = {},
			ARROW_START = Const.ARROW_START,
			ARROW_SIZE = Const.ARROW_SIZE,
			BOND_LENGTH = Const.BOND_LENGTH,
			BONDS_AUX = Const.BONDS_AUX,
			BETWEEN_DBL_BONDS = Const.BETWEEN_DBL_BONDS,
			BETWEEN_TRP_BONDS = Const.BETWEEN_TRP_BONDS,
			Atom = DCAtom.Atom,
			Arrow = DCArrow.Arrow,
			Bond = DCBond.Bond,
			Selection = DCSelection.Selection;

		/**
		 * Modifies the structure.
		 * @param {Structure} base - structure to be modified,
		 * @param {StructureCluster} mod - StructureCluster containing appropriate Structure objects,
		 * @param {Number[]} mousePos - position of the mouse when 'mouseup' event occurred
		 * @param {Number[]|undefined} down - position of the mouse when 'mousedown' event occurred
		 * @param {Boolean} mouseDownAndMove - true if 'mouseonmove' and 'mousedown' are true
		 * @returns {Structure}
		 */
		service.modifyStructure = function (base, mod, mousePos, down, mouseDownAndMove) {
			var modStr, firstAtom,
				found = false,
				isInsideCircle,
				origin = base.getOrigin();

			modStructure(base.getStructure(), origin);

			return base;

			/**
			* Recursively looks for an atom to modify.
			* @param {Atom[]|Bond[]} struct - array of atoms or array of bonds,
			* @param {Number[]} pos - absolute coordinates of an atom
			*/
			function modStructure(struct, pos) {
				var i, absPos, aux;
				for(i = 0; i < struct.length; i += 1) {
					if (struct[i] instanceof Arrow) {
						continue;
					}

					aux = struct[i] instanceof Atom ? struct[i]: struct[i].getAtom();

					if (struct[i] instanceof Atom) { firstAtom = struct[i]; } // remember first atom in each structure

					absPos = [aux.getCoords("x") + pos[0], aux.getCoords("y") + pos[1]];

					if (found) { break; }

					isInsideCircle = insideCircle(absPos, mousePos);

					if (isInsideCircle && !mouseDownAndMove) {
						// if 'mouseup' was within a circle around an atom
						// and if a valid atom has not already been found
							modStr = chooseMod(aux);
							updateBonds(aux, modStr, absPos);
							updateDecorate(modStr, absPos);
							found = true;
							return base;
					}

					if (!isInsideCircle && compareCoords(down, absPos, 5)) {
						// if 'mousedown' was within a circle around an atom
						// but 'mouseup' was not
						// and if a valid atom has not already been found
						modStr = chooseDirectionManually(aux);
						updateBonds(aux, modStr, absPos);
						updateDecorate(modStr, absPos);
						found = true;
						return base;
					}

					// if none of the above was true, then continue looking down the structure tree
					modStructure(aux.getBonds(), absPos);
				}

				/**
				 * Updates decorate elements (e.g. aromatic rings) in the structure.
				 * @param {Structure} modStr - Structure object which may contain decorate elements
				 * @param {Number[]} abs - absolute coordinates
				 */
				function updateDecorate(modStr, abs) {
					var coords;
					if (modStr !== null && modStr.getAromatic() && typeof firstAtom !== "undefined") {
						coords = Const.getBondByDirection(modStr.getName()).bond;
						return base.addDecorate("aromatic", {
							fromWhich: firstAtom.getCoords(),
							coords: [coords[0] + abs[0], coords[1] + abs[1]]
						});
					}
				}

				/**
				 * Updates bonds array in an Atom object.
				 * @param {Atom} atom - an Atom object or Bond object to update
				 * @param {Atom[]} modStr - an array of Atom objects to attach
				 * @param {Number[]} absPos - absolute position of the atom to update
				 */
				function updateBonds(atom, modStr, absPos) {
					if (modStr !== null) {
						modifyExisting(modStr, absPos);
						atom.addBonds(modStr.getStructure(0).getBonds());
					}
				}

				/**
				 * Checks if an atom already exists. If it does, that atoms attachedBonds array is updated.
				 * @param {Atom[]} modStr - an array of Atom objects
				 * @param {Number[]} absPos - absolute position of the atom to update
				 */
				function modifyExisting(modStr, absPos) {
					var i, newAbsPos, atom, newName,
						struct = modStr.getStructure(0).getBonds();
					for(i = 0; i < struct.length; i += 1) {
						newAbsPos = [struct[i].getAtom().getCoords("x") + absPos[0], struct[i].getAtom().getCoords("y") + absPos[1]];
						atom = service.isWithin(base, newAbsPos).foundAtom;
						if (typeof atom !== "undefined") {
							newName = Atom.getOppositeDirection(modStr.getName());
							atom.attachBond({ direction: newName, type: mod.getBondsMultiplicity() });
							return atom.calculateNext();
						}
					}
				}
			}

			/**
			 * Compares coordinates in two arrays. Returns false if at least one of them is undefined or if any pair of the coordinates is inequal.
			 * Returns true if they are equal.
			 * @param {Number[]} arr1 - an array of coordinates,
			 * @param {Number[]} arr2 - an array of coordinates,
			 * @param {Number} prec - precision,
			 * @returns {Boolean}
			 */
			function compareCoords(arr1, arr2, prec) {
				if (typeof arr1 === "undefined" || typeof arr2 === "undefined") {
					return false;
				}
				return arr1[0].toFixed(prec) === arr2[0].toFixed(prec) && arr1[1].toFixed(prec) === arr2[1].toFixed(prec);
			}

			/**
			 * Lets the user decide in which of the eight directions the next bond is going to be pointing.
			 * Draws a circle around a chosen atom and divides it into eight equal parts. Checks to which part the coordinates
			 * associated with the 'mouseup' event belong and chooses the suitable bond.
			 * @param {Atom} current - currently active Atom object
			 * @returns {Atom[]}
			 */
			function chooseDirectionManually(current) {
				return chooseMod(current, service.getDirection(mousePos, down));
			}

			/**
			 * Chooses a suitable modification from mod object.
			 * @param {Atom} current - currently active Atom object
			 * @param {String|undefined} - outgoing direction (either manually or automatically set)
			 * @returns {Atom[]}
			 */
			function chooseMod(current, output) {
				var i, at, name, toCompare, next;
				if (mod.defs.length === 1) {
					return mod.getDefault().getStructure(0).getBonds();
				} else {
					for(i = 0; i < mod.defs.length; i += 1) {
						at = mod.defs[i];
						next = current.getNext();
						if (next === "max") {
							return null;
						}
						name = at.getName();
						toCompare = output || next;
						if (toCompare === name) {
							current.attachBond({ direction: name, type: mod.getBondsMultiplicity() });
							current.calculateNext();
							return at;
						}
					}
				}
			}
		}

		/**
		 * Looks for an atom Object (or Objects if more than one has the specified coords) and deletes it.
		 * Attaches items in its 'bonds' array directly to 'structure' array in Structure object.
		 * @params {Structure} structure - a Structure object to modify,
		 * @params {Number[]} mouseCoords - coordinates of the mouse pointer (where 'mouseup occurred')
		 * @returns {Structure}
		 */
		service.deleteFromStructure = function (structure, mouseCoords) {
			var origin = structure.getOrigin(), newAtomArray = [], aux = [];

			// recursievly look for an atom to delete
			check(structure.getStructure(), origin);

			// applies new coords to the found atom Objects
			angular.forEach(newAtomArray, function (ob) {
				var obj = ob.obj;
				if (obj instanceof Arrow) {
					obj.setOrigin(ob.coords);
				} else if (obj instanceof Atom) {
					obj.setCoords(ob.coords);
				}
				aux.push(obj);
			});

			structure.setStructure(aux);

			return structure;

			/**
			* Recursively looks for atom Objects to delete.
			* @param {Atom|Bond|Arrow} struct - 'structure' array or 'bonds' array,
			* @param {Number[]} pos - current absolute position,
			* @param {Atom} prevAtom - preceding atom Object (makes sense when iterating over 'bonds' array)
			*/
			function check(struct, pos, prevAtom) {
				var i, absPos, current, newBondArray = [], absPosStart, absPosEnd;
				for(i = 0; i < struct.length; i += 1) {
					current = struct[i];
					if (current instanceof Arrow) {
						// current Object is arrow
						absPosStart = [current.getOrigin("x") + pos[0], current.getOrigin("y") + pos[1]];
						absPosEnd = [current.getEnd("x") + pos[0], current.getEnd("y") + pos[1]];
						if (!(insideCircle(absPosStart, mouseCoords) || insideCircle(absPosEnd, mouseCoords))) {
							// if this arrow was NOT chosen then don't apply any changes
							// omit it otherwise
							newAtomArray.push({ obj: current, coords: current.getOrigin() });
						}
					} else if (current instanceof Atom) {
						// current Object is atom
						absPos = [current.getCoords("x") + pos[0], current.getCoords("y") + pos[1]];
						if (insideCircle(absPos, mouseCoords)) {
							// if this atom was chosen then apply changes
							changeArray(absPos, current);
						} else {
							// don't change anything otherwise
							newAtomArray.push({ obj: current, coords: current.getCoords() });
						}
						check(current.getBonds(), absPos, current);
					} else if (current instanceof Bond) {
						// current Object is bond
						absPos = [current.getAtom().getCoords("x") + pos[0], current.getAtom().getCoords("y") + pos[1]];
						if (insideCircle(absPos, mouseCoords)) {
							// if atom at the end of this bond was chosen then apply changes
							changeArray(absPos, current.getAtom());
						} else {
							// don't change anything otherwise
							newBondArray.push(current);
						}
						check(current.getAtom().getBonds(), absPos, current.getAtom());
					}
				}

				// when finished iterating over 'bonds' array
				// set an array of all bond Objects that were NOT chosen
				// otherwise prevAtom is undefined
				if (typeof prevAtom !== "undefined") { prevAtom.setBonds(newBondArray); }

				// extracts atom Objects from the 'bonds' array of the deleted atom Object
				// adds them to 'newAtomArray' array and sets their new coords
				function changeArray(absPos, atom) {
					var i, newCoords, newAbsPos, at;
					for (i = 0; i < atom.getBonds().length; i += 1) {
						at = atom.getBonds(i).getAtom();
						newAbsPos = [at.getCoords("x") + absPos[0], at.getCoords("y") + absPos[1]];
						newCoords = Utils.subtractCoords(newAbsPos, origin);
						newAtomArray.push({ obj: at, coords: newCoords });
					}
				}
			}
		}

		/**
		 * Checks if the mouse pointer is within a circle of an atom.
		 * @param {Structure} structure - a Structure object on which search is performed
		 * @param {Number[]} position - set of coordinates against which the search is performed
		 * @returns {Atom}
		 */
		service.isWithin = function (structure, position) {
			var found = false,
				foundObj = {},
				origin = structure.getOrigin();

			check(structure.getStructure(), origin);

			return foundObj;

			function check(struct, pos) {
				var i, absPos, aux;
				for(i = 0; i < struct.length; i += 1) {
					if (struct[i] instanceof Arrow) {
						continue;
					}
					aux = struct[i] instanceof Atom ? struct[i]: struct[i].getAtom();
					absPos = [aux.getCoords("x") + pos[0], aux.getCoords("y") + pos[1]];
					if (!found && insideCircle(absPos, position)) {
						found = true;
						foundObj.foundAtom = aux;
						foundObj.absPos = absPos;
					} else {
					  check(aux.getBonds(), absPos);
					}
				}
			}
		}

		/**
		 * Generates the desired output based on given input.
		 * @param {Structure} input - a Structure object containing all information needed to render the shape
		 * @param {String} id - id of the object to be created (will be used inside 'g' tag and in 'use' tag)
		 */
		service.draw = function (input, id) {
			var shape,
				output = parseInput(input),
				paths = output.paths,
				circles = output.circles,
				labels = output.labels,
				rects = output.rects,
				minMax = output.minMax;
			shape = new DCShape.Shape(genElements().full, genElements().mini, id);
			shape.elementFull = shape.generateStyle("expanded") + shape.elementFull;
			shape.elementMini = shape.generateStyle("base") + shape.elementMini;
			shape.setMinMax(minMax);
			return shape;

			/**
			 * Generates a string from the output array and wraps each line with 'path' tags, each circle with 'circle' tags,
			 * and each decorate element with suitable tags.
			 */
			function genElements() {
				var full = "", mini = "", aux = "";
				rects.forEach(function (rect) {
					aux = "<rect class='" + rect.class +
						"' x='" + rect.rect[0] +
						"' y='" + rect.rect[1] +
						"' width='" + rect.rect[2] +
						"' height='" + rect.rect[3] +
						"'></rect>";
					full += aux;
					mini += aux;
				});
				paths.forEach(function (path) {
					if (typeof path.class !== "undefined") {
						aux = "<path class='" + path.class + "' d='" + path.line + "'></path>";
					} else {
						aux = "<path d='" + path.line + "'></path>";
					}
					full += aux;
					mini += aux;
				});
				circles.forEach(function (circle) {
					var aux = circle.selected ? "edit": "atom";
					full += "<circle class='" + aux + "' cx='" + circle.circle[0] + "' cy='" + circle.circle[1] + "' r='" + circle.circle[2] + "' ></circle>";
				});
				labels.forEach(function (label) {
					aux = drawDodecagon(label) +
						"<text dy='0.2125em' x='" + label.labelX + "' " +
						"atomx='" + label.atomX + "' " +
						"atomy='" + label.atomY + "' " +
						"y='" + label.labelY + "' " +
						"text-anchor='" + genTextAnchor(label.mode) + "' " +
						">" + genLabel(label.label) + "</text>";
					full += aux;
					mini += aux;
				});
				if (input.getDecorate("aromatic")) {
					input.getDecorate("aromatic").forEach(function (arom) {
						aux = "<circle class='arom' cx='" + arom.coords[0] +
						"' cy='" + arom.coords[1] +
						"' r='" + Const.AROMATIC_R +
						"' ></circle>";
						full += aux;
						mini += aux;
					})
				}

				return {
					full: full,
					mini: mini
				};

				function genTextAnchor(mode) {
					if (mode === "rl") {
						return "end";
					} else if (mode === "lr") {
						return "start";
					} else {
						return "start";
					}
				}

				function genLabel(labelName) {
					var i, aux, isPreceded = false, output = "";
					for (i = 0; i < labelName.length; i += 1) {
						aux = labelName.substr(i, 1);
						if (Utils.isNumeric(aux)) {
							output += "<tspan class='sub' dy='" + DCShape.fontSize * 0.25 + "' >" + aux + "</tspan>";
							isPreceded = true;
						} else if (isPreceded) {
							output += "<tspan dy='-" + DCShape.fontSize * 0.25 + "' >" + aux + "</tspan>";
							isPreceded = false;
						} else {
							output += "<tspan>" + aux + "</tspan>";
						}
					}
					return output;
				}

				function drawDodecagon(label) {
					var i, x, y, aux, factor,result = [];

					factor = 0.5 * label.height / BOND_LENGTH;
					for (i = 0; i < BONDS_AUX.length; i += 1) {
						x = BONDS_AUX[i].bond[0];
						y = BONDS_AUX[i].bond[1];
						result = result.concat(Utils.addCoords([label.atomX, label.atomY], [x, y], factor));
					}
					return "<polygon class='text' points='" + stringifyPaths([result])[0].line + "'></polygon>";
				}
			}

			/**
			* Translates the input into an svg-suitable set of coordinates.
			* @param {Structure} input - an input object
			* @returns {Object}
			*/
		  function parseInput(input) {
				var output = [], circles = [], labels = [], rects = [], i, absPos, absPosStart, absPosEnd, len, selection, atom, arrow, obj,
					origin = input.getOrigin(), minMax = { minX: origin[0], maxX: origin[0], minY: origin[1], maxY: origin[1] },
					circR = Const.CIRC_R, width, height, quarter, startX, startY;

				for (i = 0; i < input.getStructure().length; i += 1) {
					obj = input.getStructure(i);
					if (obj instanceof Selection) {
						selection = obj;
						absPosStart = Utils.addCoordsNoPrec(origin, selection.getOrigin());
						absPosEnd = selection.getCurrent();
						quarter = selection.getQuarter();
						if (quarter === 1) {
							startX = absPosStart[0];
							startY = absPosEnd[1];
							width = absPosEnd[0] - startX;
							height = absPosStart[1] - startY;
						} else if (quarter === 2) {
							startX = absPosEnd[0];
							startY = absPosEnd[1];
							width = absPosStart[0] - startX;
							height = absPosStart[1] - startY;
						} else if (quarter === 3) {
							startX = absPosEnd[0];
							startY = absPosStart[1];
							width = absPosStart[0] - startX;
							height = absPosEnd[1] - startY;
						} else if (quarter === 4) {
							startX = absPosStart[0];
							startY = absPosStart[1];
							width = absPosEnd[0] - startX;
							height = absPosEnd[1] - startY;
						}

						rects.push({ class: "selection", rect: [startX, startY, width, height] });
					} else if (obj instanceof Atom) {
						atom = obj;
						absPos = Utils.addCoordsNoPrec(origin, atom.getCoords());
						updateLabel(absPos, atom);
						updateMinMax(absPos);
						len = output.push(["M", absPos]);
						circles.push({ selected: atom.selected, circle: [absPos[0], absPos[1], circR] });
						connect(absPos, atom.getBonds(), output[len - 1], atom.selected);
					} else if (obj instanceof Arrow) {
						arrow = obj;
						absPosStart = Utils.addCoordsNoPrec(origin, arrow.getOrigin());
						absPosEnd = Utils.addCoordsNoPrec(origin, arrow.getEnd());
						updateMinMax(absPosStart);
						updateMinMax(absPosEnd);
						if (arrow.selected) {
							circles.push({ selected: true, circle: [ absPosStart[0], absPosStart[1], circR ] })
							circles.push({ selected: true, circle: [ absPosEnd[0], absPosEnd[1], circR ] })
						}
						output.push(calcArrow(absPosStart, absPosEnd, arrow.getType()));
					}
				}

				return {
					paths: stringifyPaths(output),
					rects: rects,
					circles: circles,
					labels: labels,
					minMax: minMax
				};

				function calcArrow(start, end, type) {
					var vectCoords = [end[0] - start[0], end[1] - start[1]],
						perpVectCoordsCW = [-vectCoords[1], vectCoords[0]],
						perpVectCoordsCCW = [vectCoords[1], -vectCoords[0]], endMarkerStart, startMarkerStart, M1, M2, L1, L2, L3, L4;
					if (type === "one-way-arrow") {
						endMarkerStart = [start[0] + vectCoords[0] * ARROW_START, start[1] + vectCoords[1] * ARROW_START];
						L1 = Utils.addCoords(endMarkerStart, perpVectCoordsCCW, ARROW_SIZE);
						L2 = Utils.addCoords(endMarkerStart, perpVectCoordsCW, ARROW_SIZE);
						return ["arrow", "M", start, "L", end, "M", endMarkerStart, "L", L1, "L", end, "L", L2, "Z"];
					} else if (type === "two-way-arrow") {
						endMarkerStart = [start[0] + vectCoords[0] * ARROW_START, start[1] + vectCoords[1] * ARROW_START];
						startMarkerStart = [start[0] + vectCoords[0] * (1 - ARROW_START), start[1] + vectCoords[1] * (1 - ARROW_START)];
						L1 = Utils.addCoords(endMarkerStart, perpVectCoordsCCW, ARROW_SIZE);
						L2 = Utils.addCoords(endMarkerStart, perpVectCoordsCW, ARROW_SIZE);
						L3 = Utils.addCoords(startMarkerStart, perpVectCoordsCCW, ARROW_SIZE);
						L4 = Utils.addCoords(startMarkerStart, perpVectCoordsCW, ARROW_SIZE);
						return [
							"arrow",
							"M", start, "L", end,
							"M", endMarkerStart, "L", L1, "L", end, "L", L2, "Z",
							"M", startMarkerStart, "L", L3, "L", start, "L", L4, "Z"
						];
					}
					else if (type === "equilibrium-arrow") {
						M1 = Utils.addCoords(start, perpVectCoordsCCW, BETWEEN_DBL_BONDS);
						L1 = Utils.addCoords(end, perpVectCoordsCCW, BETWEEN_DBL_BONDS);
						endMarkerStart = [parseFloat(M1[0]) + vectCoords[0] * ARROW_START, parseFloat(M1[1]) + vectCoords[1] * ARROW_START];
						L2 = Utils.addCoords(endMarkerStart, perpVectCoordsCCW, ARROW_SIZE);

						M2 = Utils.addCoords(end, perpVectCoordsCW, BETWEEN_DBL_BONDS);
						L3 = Utils.addCoords(start, perpVectCoordsCW, BETWEEN_DBL_BONDS);
						startMarkerStart = [parseFloat(L3[0]) + vectCoords[0] * (1 - ARROW_START), parseFloat(L3[1]) + vectCoords[1] * (1 - ARROW_START)];
						L4 = Utils.addCoords(startMarkerStart, perpVectCoordsCW, ARROW_SIZE);

						return [
							"arrow-eq",
							"M", M1, "L", L1, "L", L2,
							"M", M2, "L", L3, "L", L4
						];
					}
				}

				/**
				* Recursively translates the input, until it finds an element with an empty 'bonds' array.
				* @param {Bond[]} bonds - an array of Bond objects
				* @param {String|Number[]} - an array of coordinates with 'M' and 'L' commands
				*/
				function connect(prevAbsPos, bonds, currentLine, selected) {
					var i, absPos, atom, bondType;
					for (i = 0; i < bonds.length; i += 1) {
						atom = bonds[i].getAtom();
						bondType = bonds[i].getType();
						absPos = [
							prevAbsPos[0] + atom.getCoords("x"),
							prevAbsPos[1] + atom.getCoords("y")
						];
						updateMinMax(absPos);
						updateLabel(absPos, atom);
						circles.push({ selected: selected, circle: [absPos[0], absPos[1], circR] });
						if (i === 0) {
							drawLine(prevAbsPos, absPos, bondType, atom, "continue", selected);
						} else {
							drawLine(prevAbsPos, absPos, bondType, atom, "begin", selected);
						}
					}
				}

				function drawLine(prevAbsPos, absPos, bondType, atom, mode, selected) {
					var newLen = output.length;
					if (bondType === "single") {
						if (mode === "continue") {
							output[newLen - 1].push("L");
							output[newLen - 1].push(absPos);
						} else if (mode === "begin") {
							newLen = output.push(["M", prevAbsPos, "L", absPos]);
						}
					} else if (bondType === "double") {
						output.push(calcDoubleBondCoords(prevAbsPos, absPos));
						newLen = output.push(["M", absPos]);
					} else if (bondType === "triple") {
						output.push(calcTripleBondCoords(prevAbsPos, absPos));
						newLen = output.push(["M", absPos]);
					} else if (bondType === "wedge") {
						output.push(calcWedgeBondCoords(prevAbsPos, absPos));
						newLen = output.push(["M", absPos]);
					} else if (bondType === "dash") {
						output.push(calcDashBondCoords(prevAbsPos, absPos));
						newLen = output.push(["M", absPos]);
					}
					connect(absPos, atom.getBonds(), output[newLen - 1], selected);
				}

				function calcDoubleBondCoords(start, end) {
					var vectCoords = [end[0] - start[0], end[1] - start[1]],
						perpVectCoordsCCW = [-vectCoords[1], vectCoords[0]],
						perpVectCoordsCW = [vectCoords[1], -vectCoords[0]],
						M1 = Utils.addCoords(start, perpVectCoordsCCW, BETWEEN_DBL_BONDS),
						L1 = Utils.addCoords(end, perpVectCoordsCCW, BETWEEN_DBL_BONDS),
						M2 = Utils.addCoords(start, perpVectCoordsCW, BETWEEN_DBL_BONDS),
						L2 = Utils.addCoords(end, perpVectCoordsCW, BETWEEN_DBL_BONDS);
					return ["M", M1, "L", L1, "M", M2, "L", L2];
				}

				function calcTripleBondCoords(start, end) {
					var vectCoords = [end[0] - start[0], end[1] - start[1]],
						perpVectCoordsCCW = [-vectCoords[1], vectCoords[0]],
						perpVectCoordsCW = [vectCoords[1], -vectCoords[0]],
						M1 = Utils.addCoords(start, perpVectCoordsCCW, BETWEEN_TRP_BONDS),
						L1 = Utils.addCoords(end, perpVectCoordsCCW, BETWEEN_TRP_BONDS),
						M2 = Utils.addCoords(start, perpVectCoordsCW, BETWEEN_TRP_BONDS),
						L2 = Utils.addCoords(end, perpVectCoordsCW, BETWEEN_TRP_BONDS);
					return ["M", M1, "L", L1, "M", start, "L", end, "M", M2, "L", L2];
				}

				function calcWedgeBondCoords(start, end) {
					var vectCoords = [end[0] - start[0], end[1] - start[1]],
						perpVectCoordsCCW = [-vectCoords[1], vectCoords[0]],
						perpVectCoordsCW = [vectCoords[1], -vectCoords[0]],
						L1 = Utils.addCoords(end, perpVectCoordsCCW, BETWEEN_DBL_BONDS),
						L2 = Utils.addCoords(end, perpVectCoordsCW, BETWEEN_DBL_BONDS);
					return ["wedge", "M", start, "L", L1, "L", L2, "Z"];
				}

				function calcDashBondCoords(start, end) {
					var i, max = 7, factor = BETWEEN_DBL_BONDS / max, M, L, currentEnd = start, result = [],
						vectCoords = [end[0] - start[0], end[1] - start[1]],
						perpVectCoordsCCW = [-vectCoords[1], vectCoords[0]],
						perpVectCoordsCW = [vectCoords[1], -vectCoords[0]];

					for (i = max; i > 0; i -= 1) {
						factor = factor + BETWEEN_DBL_BONDS / max;
						currentEnd = [currentEnd[0] + vectCoords[0] / max, currentEnd[1] + vectCoords[1] / max];
						M = Utils.addCoords(currentEnd, perpVectCoordsCCW, factor);
						L = Utils.addCoords(currentEnd, perpVectCoordsCW, factor);
						result = result.concat(["M", M, "L", L]);
					}
					return result;
				}

				function updateLabel(absPos, atom) {
					var label = atom.getLabel(), labelObj;
					if (typeof label !== "undefined") {
						labelObj = genLabelInfo();
						labels.push(labelObj);
					}

					function genLabelInfo() {
						var bondsRemained = label.getMaxBonds() - calcBondsIn(atom.getAttachedBonds()) - calcBondsOut(atom.getBonds()),
							labelNameObj = { name: label.getLabelName() };

						addHydrogens();

						return {
							length: labelNameObj.name.length,
							label: labelNameObj.name,
							mode: label.getMode(),
							atomX: absPos[0],
							atomY: absPos[1],
							labelX: absPos[0] + labelNameObj.correctX,
							labelY: absPos[1] + 0.09 * BOND_LENGTH,
							width: DCShape.fontSize * labelNameObj.name.length,
							height: DCShape.fontSize
						};

						function calcBondsIn(bonds) {
							var i, type, result = 0;
							for (i = 0; i < bonds.length; i += 1) {
								type = bonds[i].type;
								switch (type) {
									case "single": result += 1; break;
									case "double": result += 2; break;
									case "triple": result += 3; break;
								}
							}
							return result;
						}

						function calcBondsOut(bonds) {
							var i, type, result = 0;
							for (i = 0; i < bonds.length; i += 1) {
								type = bonds[i].getType();
								switch (type) {
									case "single": result += 1; break;
									case "wedge": result += 1; break;
									case "dash": result += 1; break;
									case "double": result += 2; break;
									case "triple": result += 3; break;
								}
							}
							return result;
						}

						function addHydrogens() {
							var i, mode = label.getMode(), hydrogens = 0;
							for (i = 0; i < bondsRemained; i += 1) {
								hydrogens += 1;
							}

							labelNameObj.hydrogens = hydrogens;

							if (typeof mode === "undefined") {
								// if mode is not known (if there was previously no label)
								// try to guess which one should it be
								mode = getTextDirection();
								label.setMode(mode);
							}

							if (hydrogens > 0) {
								// only happens for predefined labels
								// custom labels can't have implicit hydrogens
								hydrogensAboveZero();
							} else {
								hydrogensZeroOrLess();
							}

							labelNameObj.correctX = calcCorrect() * BOND_LENGTH;

							function hydrogensAboveZero() {
								if (mode === "rl") {
									labelNameObj.name = hydrogens === 1 ?
										 "H" + labelNameObj.name: "H" + hydrogens + labelNameObj.name;
								} else if (mode === "lr") {
									labelNameObj.name = hydrogens === 1 ?
										labelNameObj.name + "H": labelNameObj.name + "H" + hydrogens;
								}
							}

							function hydrogensZeroOrLess() {
								if (mode === "rl") {
									labelNameObj.name = Utils.invertGroup(labelNameObj.name);
								}
							}

							function getTextDirection() {
								var countE = 0;
								atom.getAttachedBonds().forEach(function (direction) {
									countE = direction.direction.indexOf("E") < 0 ? countE: countE + 1;
								});
								return countE > 0 ? "rl": "lr";
							}

							function calcCorrect() {
								if (mode === "rl") {
									return 0.175;
								} else if (mode === "lr") {
									return -0.175;
								} else if (mode === "tb") {

								} else if (mode === "bt") {

								}
							}
						}
					}
				}

				function updateMinMax(absPos) {
					if (absPos[0] > minMax.maxX) {
						minMax.maxX = absPos[0];
					}
					if (absPos[0] < minMax.minX) {
						minMax.minX = absPos[0];
					}
					if (absPos[1] > minMax.maxY) {
						minMax.maxY = absPos[1];
					}
					if (absPos[1] < minMax.minY) {
						minMax.minY = absPos[1];
					}
				}
			}
		}

		/**
		 * Divides a circle (center at pos2) into 12 parts and checks to which part the coords at pos1 belong.
		 * @param {Number[]} pos1 - coordinates of the center
		 * @param {Number[]} pos2 - coords to check
		 * @returns {String}
		 */
		service.getDirection = function (pos1, pos2) {
			var alpha = Math.PI / 6,
				r = Math.sqrt(Math.pow((pos1[0] - pos2[0]), 2) + Math.pow((pos1[1] - pos2[1]), 2)),
				x = Math.sin(alpha / 2) * r,
				x1 = Math.cos(3 * alpha / 2) * r,
				y = Math.cos(alpha / 2) * r,
				y1 = Math.sin(3 * alpha / 2) * r;

			if (check(-x, x, -r, -y)) {
				return "N";
			} else if (check(x, x1, -y, -y1)) {
				return "NE1";
			} else if (check(x1, y, -y1, -x)) {
				return "NE2";
			} else if (check(y, r, -x, x)) {
				return "E";
			} else if (check(x1, y, x, y1)) {
				return "SE1";
			} else if (check(x, x1, y1, y)) {
				return "SE2";
			} else if (check(-x, x, y, r)) {
				return "S";
			} else if (check(-x1, -x, y1, y)) {
				return "SW1";
			} else if (check(-y, -x1, x, y1)) {
				return "SW2";
			} else if (check(-r, -y, -x, x)) {
				return "W";
			} else if (check(-y, -x1, -y1, -x)) {
				return "NW1";
			} else if (check(-x1, -x, -y, -y1)) {
				return "NW2";
			}

			function check(arg1, arg2, arg3, arg4) {
				return pos1[0] >= (pos2[0] + arg1) && pos1[0] <= (pos2[0] + arg2) &&
					pos1[1] >= (pos2[1] + arg3) && pos1[1] <= (pos2[1] + arg4);
			}
		}

		return service;

		/**
		 * Checks if a point is inside an area delimited by a circle.
		 * @param {Number[]} center - coordinates of the center of a circle
		 * @param {Number[]} point - coordinates of a point to be validated
		 * @returns {Boolean}
		 */
		function insideCircle(center, point) {
			var tolerance = Const.CIRC_R;
			return Math.abs(center[0] - point[0]) < tolerance && Math.abs(center[1] - point[1]) < tolerance;
		}

		/**
		* Transforms output into an array of strings.
		* Basically, it translates each array of coordinates into its string representation.
		* @returns {String[]}
		*/
		function stringifyPaths(output) {
			var result = [], i, j, line, point, lineStr;
			for (i = 0; i < output.length; i += 1) {
				line = output[i];
				lineStr = { line: "" };
				for (j = 0; j < line.length; j += 1) {
					point = line[j];
					if (typeof point === "string") {
						if (point === "arrow" || point === "arrow-eq" || point === "wedge") {
							lineStr.class = point;
						} else {
							lineStr.line += point + " ";
						}
					} else {
						lineStr.line += point[0] + " " + point[1] + " ";
					}
				}
				result.push(lineStr);
			}
			return result;
		}
	}
})();
