async function fetchData(path) {
    const response = fetch(path);
    const data = await (await response).text();
    const rows = data.split("\n");

    return rows;
}

async function ddlLvlOneIndexChanged() {
    const lvlOneSelected = ddlLvlOne.value;
    await fetchDdlLvlTwo(lvlOneSelected);
}

async function fetchDdlLvlTwo(indexLvlOne) {
    ddlLvlTwo.style.display = "block";
    ddlLvlTwo.innerHTML = "";
    ddlLvlThree.style.display = "none";
    ddlLvlThree.innerHTML = "";
    ddlLvlFour.style.display = "none";
    ddlLvlFour.innerHTML = "";
    $("#ddlLvlTwo").append('<option value="0">Bitte Ausw&auml;hlen</option>');

    await fetchData("oekoBau/obLvlTwo.csv").then((rows) => {
        rows.forEach((row) => {
            if (!row) {
                return;
            }
            const columns = row.split(";");

            if (columns[0] == indexLvlOne) {
                const ddlName = columns[2].trim();
                const ddlVal = columns[0].trim() + ";" + columns[1].trim();

                $("#ddlLvlTwo").append(
                    '<option value="' + ddlVal + '">' + ddlName + "</option>"
                );
            }
        });
    });
}

async function ddlLvlTwoIndexChanged() {
    const lvlTwoSelected = ddlLvlTwo.value;
    const [indexLvlOne, indexLvlTwo] = lvlTwoSelected.split(";");

    await fetchDdlLvlThree(indexLvlOne, indexLvlTwo);
}

async function fetchDdlLvlThree(indexLvlOne, indexLvlTwo) {
    ddlLvlThree.style.display = "block";
    ddlLvlThree.innerHTML = "";
    ddlLvlFour.style.display = "none";
    ddlLvlFour.innerHTML = "";
    $("#ddlLvlThree").append('<option value="0">Bitte Ausw&auml;hlen</option>');
    let foundItem = false;

    await fetchData("oekoBau/obLvlThree.csv").then((rows) => {
        rows.forEach((row) => {
            const columns = row.split(";");

            if (columns[0] == indexLvlOne && columns[1] == indexLvlTwo) {
                foundItem = true;
                const ddlName = columns[3].trim();
                const ddlVal =
                    columns[0].trim() + ";" + columns[1].trim() + ";" + columns[2].trim();

                $("#ddlLvlThree").append(
                    '<option value="' + ddlVal + '">' + ddlName + "</option>"
                );
            }
        });
    });
    if (!foundItem) {
        ddlLvlThree.style.display = "none";
        alert("Es liegen aktuell noch keine Daten zu dieser Kategorie vor");
    }
}

async function ddlLvlThreeIndexChanged() {
    const lvlThreeSelected = ddlLvlThree.value;

    const [indexLvlOne, indexLvlTwo, indexLvlThree] = lvlThreeSelected.split(";");
    fetchDdlLvlFour(indexLvlOne, indexLvlTwo, indexLvlThree);
}

async function fetchDdlLvlFour(indexLvlOne, indexLvlTwo, indexLvlThree) {
    let prodEmValues = {};
    let obDataItems = {};
    let foundItem = false;

    ddlLvlFour.innerHTML = "";
    ddlLvlFour.style.borderColor = "#dbdfe2";
    $("#ddlLvlFour").append('<option value="0">Bitte Ausw&auml;hlen</option>');

    await fetchData("oekoBau/obCore.csv").then((rows) => {
        rows.forEach((row) => {
            if (!row) {
                return;
            }
            const columns = row.split(";");

            if (
                columns[0] == indexLvlOne &&
                columns[1] == indexLvlTwo &&
                columns[2] == indexLvlThree
            ) {
                foundItem = true;

                const prodName = columns[3].trim();
                const prodUnit = columns[4].trim();
                const prodWeight = parseFloat(columns[6].trim());
                const prodMod = columns[5].trim();
                const prodCarbEm = parseFloat(columns[7].trim());

                if (prodCarbEm == 0) {
                    return;
                }

                if (obDataItems.hasOwnProperty(prodName)) {
                    if (prodEmValues.hasOwnProperty(prodMod)) {
                        prodEmValues[prodMod] += prodCarbEm;
                    } else {
                        prodEmValues[prodMod] = prodCarbEm;
                    }
                    obDataItems[prodName].prodEmValues = prodEmValues;
                } else {
                    prodEmValues = {};
                    prodEmValues[prodMod] = prodCarbEm;
                    let obDataItem = new obDataProperties(
                        prodName,
                        prodUnit,
                        prodWeight,
                        prodEmValues
                    );
                    obDataItems[prodName] = obDataItem;
                }
            }
        });
    });

    if (!foundItem) {
        ddlLvlFour.style.display = "none";
        alert("Es liegen aktuell noch keine Daten zu dieser Kategorie vor");
        return;
    }

    ddlLvlFour.style.display = "block";
    sortedObDataItems = Object.fromEntries(
        Object.entries(obDataItems).sort((a, b) => a[0].localeCompare(b[0]))
    );
    for (let item in sortedObDataItems) {
        value = JSON.stringify(sortedObDataItems[item]);
        $("#ddlLvlFour").append($("<option/>").attr("value", value).text(item));
    }
}

function ddlLvlFourIndexChanged() {
    const ddlLvlFourValue = ddlLvlFour.value;
    obDataItemOnFocus = JSON.parse(ddlLvlFourValue);

    document.getElementById("qtyUnit").innerText = obDataItemOnFocus.prodUnit;
    ddlLvlFour.style.borderColor = "#4165e1";
    toggleCheckbox();
}

function toggleCheckbox() {
    if ("D" in obDataItemOnFocus.prodEmValues) {
        chckbxEoL.disabled = false;
        chckbxEoL.checked = true;
        return;
    }
    chckbxEoL.disabled = true;
    chckbxEoL.checked = false;
}

async function aceSearch() {
    //Autocomplete Function
    $(document).ready(function () {
        SearchText();
    });

    async function SearchText() {
        $("#txtSearch").autocomplete({
            minLength: 3,
            autoFocus: true,
            select: function (e, ui) {
                const path = ui.item.path;
                const label = ui.item.label;
                $.ajax({
                    source: processAceResult(label, path),
                });
            },
            source: function (request, response) {
                $.ajax({
                    source: autoComplete(request, response),
                });
            },
        });
    }

    async function autoComplete(request, response) {
        let loggedItems = [];
        let aceResults = [];
        data = request.term;

        await fetchData("oekoBau/obCore.csv").then((rows) => {
            rows.forEach((row) => {
                if (!row) {
                    return;
                }
                const columns = row.split(";");
                item = columns[3];

                if (item && item.toLowerCase().includes(data.toLowerCase())) {
                    if (!loggedItems.includes(item)) {
                        path = [columns[0], columns[1], columns[2]];
                        aceResults.push({label: item, path: path});
                        loggedItems.push(item);
                    }
                }
            });
            aceResults.sort((a, b) => a.label.localeCompare(b.label));
            response(aceResults);
        });
    }

    async function processAceResult(label, path) {
        ddlLvlOne.selectedIndex = path[0];
        await fetchDdlLvlTwo(path[0]);
        ddlLvlTwo.selectedIndex = path[1];
        await fetchDdlLvlThree(path[0], path[1]);
        ddlLvlThree.selectedIndex = path[2];
        await fetchDdlLvlFour(path[0], path[1], path[2]);

        selectDdlByName(ddlLvlFour, label);
        ddlLvlFour.style.borderColor = "#4165e1";
        const ddlLvlFourValue = ddlLvlFour.value;
        obDataItemOnFocus = JSON.parse(ddlLvlFourValue);

        document.getElementById("qtyUnit").innerText = obDataItemOnFocus.prodUnit;
        toggleCheckbox();
    }
}

function selectDdlByName(ddl, name) {
    for (let i = 0; i < ddl.options.length; i++) {
        if (ddl.options[i].text === name) {
            ddl.selectedIndex = i;
            break;
        }
    }
}

function calcCarbEm() {
    const qty = parseFloat(
        document.getElementById("txtQty").value.replace(",", ".")
    );
    const distance = ddlDistance.value;

    const prodName = obDataItemOnFocus.prodName;
    const prodUnit = obDataItemOnFocus.prodUnit;
    const prodWeight = obDataItemOnFocus.prodWeight;

    const lastCurEmCost = curEmCost.toString();
    const lastGloEmCost = gloEmCost.toString();
    const lastTotalEm = totalEm.toString();
    [gloEmCost, curEmCost, totalEm] = [0, 0, 0];

    if (!validateInput) {
        return;
    }

    const transportEmission = calculateTransportEmissions(
        qty,
        distance,
        prodWeight
    );
    const modValues = calculateEmissionsPerModule(qty);
    const chartTitle = updateChart(
        qty,
        prodName,
        distance,
        prodUnit,
        transportEmission,
        modValues
    );
    const emissionUnit = displayInfoText(
        qty,
        distance,
        transportEmission,
        chartTitle,
        prodWeight
    );
    updateBanners(lastTotalEm, lastGloEmCost, lastCurEmCost, emissionUnit);
}

function validateInput() {
    if (obDataItemOnFocus == "") {
        alert("Bitte w&auml;hlen Sie einen Baustoff aus");
        return false;
    }
    return true;
}

function calculateTransportEmissions(qty, distance, prodWeight) {
    let transportEmission;
    switch (distance) {
        case "Deutschland":
            transportEmission = 100 * qty * prodWeight * 0.0004;
            break;
        case "Europa":
            transportEmission = 600 * qty * prodWeight * 0.0004;
            break;
        case "Asien":
            transportEmission = 8800 * qty * prodWeight * 0.0004;
            break;
        case "Nordamerika":
            transportEmission = 7000 * qty * prodWeight * 0.0004;
            break;
        case "S&uuml;damerika":
            transportEmission = 7800 * qty * prodWeight * 0.0004;
            break;
        case "Ozeanien":
            transportEmission = 14500 * qty * prodWeight * 0.0004;
            break;
        case "Afrika":
            transportEmission = 7000 * qty * prodWeight * 0.0004;
            break;
        default:
            transportEmission = parseInt(distance) * qty * prodWeight * 0.0004;
            break;
    }

    totalEm += transportEmission;

    return transportEmission;
}

function calculateEmissionsPerModule(qty) {
    let modValues = {...obDataItemOnFocus.prodEmValues};
    let totalCarbEmPerUnit = 0;

    if (
        modValues.hasOwnProperty("A1-A3") &&
        modValues.hasOwnProperty("A1") &&
        modValues.hasOwnProperty("A2") &&
        modValues.hasOwnProperty("A3")
    ) {
        delete modValues["A1-A3"];
    }

    if (!chckbxEoL.checked && "D" in modValues) {
        delete modValues["D"];
    }

    for (let module in modValues) {
        totalCarbEmPerUnit += modValues[module];
    }

    totalEm += totalCarbEmPerUnit * qty;
    gloEmCost = (totalEm * gloEmCostInEuroPerTonCO2E) / 1000;
    curEmCost = (totalEm * curEmCostInEuroPerTonCO2E) / 1000;

    return modValues;
}

function updateChart(
    qty,
    prodName,
    distance,
    prodUnit,
    transportEmission,
    modValues
) {
    let chartProdname = prodName;
    let chartTitle;
    if (chartProdname.length > 25) {
        chartProdname = prodName.substring(0, 35) + "...";
    }
    if (isNaN(parseInt(distance))) {
        chartTitle =
            qty.toLocaleString("de-DE") +
            " " +
            prodUnit +
            " " +
            chartProdname +
            " aus " +
            distance;
    } else {
        chartTitle =
            qty.toLocaleString("de-DE") + " " + prodUnit + " " + chartProdname;
    }

    tooltips = [
        ["", "Aufgliederung nach Modulen:"],
        [],
        ["", "Aufgliederung nach Modulen:"],
        ["", "Aufgliederung nach Modulen:"],
        ["", "Aufgliederung nach Modulen:"],
    ];

    let carbEmPerModAccumulated = {A: 0, B: 0, C: 0, D: 0};

    let modToTooltipId = {A: 0, B: 2, C: 3, D: 4};

    for (let module in modValues) {
        if (modValues[module] != 0) {
            tooltipId = modToTooltipId[module[0]];
            updateTooltip(modValues, module, qty, modToTooltipId[module[0]]);
            carbEmPerModAccumulated[module[0]] += modValues[module] * qty;
        }
    }

    obChart.data.datasets[0].data[0] = carbEmPerModAccumulated["A"];
    obChart.data.datasets[1].data[0] = transportEmission;
    obChart.data.datasets[2].data[0] = carbEmPerModAccumulated["B"];
    obChart.data.datasets[3].data[0] = carbEmPerModAccumulated["C"];
    obChart.data.datasets[4].data[0] = carbEmPerModAccumulated["D"];

    obChart.data.labels[0] = chartTitle;
    obChart.options.scales.y.title.text =
        (totalEm > 1000 || totalEm < -1000) ? "t CO₂e" : "kg CO₂e";

    obChart.update();

    return chartTitle;
}

function updateTooltip(modValues, module, qty, tooltipId) {
    let moduleNames = {
        A1: "Rohstoffbereitstellung",
        A2: "Transport zum Hersteller",
        A3: "Herstellung",
        A4: "Transport",
        A5: "Bau/Einbau",
        "A1-A3": "Herstellungsprozess",
        B1: "Nutzung",
        B2: "Instandhaltung",
        B3: "Reparatur",
        B4: "Ersatz",
        B5: "Umbau/Erneuerung",
        B6: "Betr. Energieeinsatz",
        B7: "Betr. Wassereinsatz",
        C1: "Abbruch",
        C2: "Abtransport",
        C3: "Abfallbewirtschaftung",
        C4: "Deponierung",
        D: "Wiederverwendungs- und Recyclingpotenzial",
    };

    [modEmissions, modEmissionsUnit] = setUnitPrefixForWeight(
        modValues[module] * qty
    );

    tooltips[tooltipId].push(
        `${moduleNames[module]}: ${modEmissions.toFixed(1)} ${modEmissionsUnit}`
    );
}

function displayInfoText(
    qty,
    distance,
    transportEmission,
    chartTitle,
    prodWeight
) {
    let potentialSavingsWhenBoughtInGermany =
        transportEmission - 100 * qty * prodWeight * 0.0004;
    const carCarbEmPerKm = totalEm * 6.17; //162g CO2E/km for a diesel Car
    const treesToCompensateEmissions = totalEm / 10;
    let emissionUnit;
    let transportSavingsUnit;

    [totalEm, emissionUnit] = setUnitPrefixForWeight(totalEm);
    if (emissionUnit == "t") {
        curEmCostFooterInfo =
            "Die aktuellen CO&#8322; Kosten Ihres Baustoffes: <strong>" +
            totalEm.toLocaleString("de-DE", {maximumFractionDigits: 1}) +
            emissionUnit +
            "  CO&#8322;e  * " +
            curEmCostInEuroPerTonCO2E +
            "€/t = " +
            curEmCost.toLocaleString("de-DE", {maximumFractionDigits: 0}) +
            "€ </strong>";
        gloEmCostFooterInfo =
            "Die aktuellen Umweltfolgekosten Ihres Baustoffes: <strong>" +
            totalEm.toLocaleString("de-DE", {maximumFractionDigits: 1}) +
            emissionUnit +
            "  CO&#8322;e  * " +
            gloEmCostInEuroPerTonCO2E +
            "€/t = " +
            gloEmCost.toLocaleString("de-DE", {maximumFractionDigits: 0}) +
            "€ </strong>";
    } else if (emissionUnit == "kg") {
        curEmCostFooterInfo =
            "Die aktuellen CO&#8322; Kosten Ihres Baustoffes: <strong>" +
            totalEm.toLocaleString("de-DE", {maximumFractionDigits: 1}) +
            emissionUnit +
            "  CO&#8322;e *" +
            curEmCostInEuroPerTonCO2E / 1000 +
            "€/kg = " +
            curEmCost.toLocaleString("de-DE", {maximumFractionDigits: 0}) +
            "€ </strong>";
        gloEmCostFooterInfo =
            "Die aktuellen Umweltfolgekosten Ihres Baustoffes: <strong>" +
            totalEm.toLocaleString("de-DE", {maximumFractionDigits: 1}) +
            emissionUnit +
            "  CO&#8322;e *" +
            gloEmCostInEuroPerTonCO2E / 1000 +
            "€/kg = " +
            gloEmCost.toLocaleString("de-DE", {maximumFractionDigits: 0}) +
            "€ </strong>";
    }
    document.getElementById("curEmCostFooterInfo").innerHTML =
        curEmCostFooterInfo;
    document.getElementById("gloEmCostFooterInfo").innerHTML =
        gloEmCostFooterInfo;

    [potentialSavingsWhenBoughtInGermany, transportSavingsUnit] =
        setUnitPrefixForWeight(potentialSavingsWhenBoughtInGermany);
    potentialSavingsWhenBoughtInGermany.toLocaleString("de-DE", {
        maximumFractionDigits: 0,
    });
    let transportInfoText;
    if (distance != "Deutschland" && isNaN(distance)) {
        transportInfoText =
            "Ihr Baustoff stammt aus " +
            distance +
            ". Wenn Sie diesen Baustoff regional beziehen, k&ouml;nnen Sie bis zu <strong>" +
            potentialSavingsWhenBoughtInGermany.toLocaleString("de-DE", {
                maximumFractionDigits: 1,
            }) +
            transportSavingsUnit +
            " CO&#8322;E </strong> einsparen.";
    } else if (!isNaN(distance) && distance > 500) {
        transportInfoText =
            "Ihr Baustoff wird " +
            distance +
            " km zu Ihnen transportiert. Wenn Sie diesen Baustoff regional beziehen, k&ouml;nnen Sie bis zu <strong>" +
            potentialSavingsWhenBoughtInGermany.toLocaleString("de-DE", {
                maximumFractionDigits: 1,
            }) +
            transportSavingsUnit +
            " CO&#8322;E </strong> einsparen.";
    } else if (prodWeight == 0) {
        transportInfoText =
            "! Zum von Ihnen ausgew&auml;hlten Baustoff k&ouml;nnen aktuell noch keine Transportemissionen berechnet werden. Ihre Transportentfernung vom Herstellerort zur Baustelle wurde in dieser Berechnung nicht mit ber&uuml;cksichtigt.";
    } else {
        transportInfoText = "";
    }
    document.getElementById("transportInfoText").innerHTML = transportInfoText;

    const summaryInfotext = `<em>${chartTitle}</em> emittieren insgesamt <strong>${totalEm.toLocaleString(
        "de-DE",
        {maximumFractionDigits: 1}
    )} ${emissionUnit} CO&#8322;e</strong> im gesamten Lebenszyklus.`;
    document.getElementById("summaryInfotext").innerHTML = summaryInfotext;
    const compensateInfoText =
        "Das entspricht ca. <a target='_blank' rel='noopener noreferrer' href='https://www.co2online.de/klima-schuetzen/mobilitaet/auto-co2-ausstoss/' style='color: black'><strong>" +
        carCarbEmPerKm.toLocaleString("de-DE", {maximumFractionDigits: 0}) +
        " km Fahrtweg </strong></a> eines durchschnittlichen PKWs. <br> Ein Baum bindet <a target='_blank' rel='noopener noreferrer' href='https://a.plant-for-the-planet.org/wp-content/uploads/2020/12/faktenblatt_baeume_co2.pdf' style='color: black'>circa 10kg CO&#8322;e. </a> Entsprechend w&auml;ren ca.<strong> " +
        treesToCompensateEmissions.toLocaleString("de-DE", {
            maximumFractionDigits: 0,
        }) +
        " B&auml;ume </strong> n&ouml;tig um den Emissionswert zu <a  href='#footer' id='aComp' data-bs-toggle='collapse' data-bs-target='#collapseThree' aria-expanded='false' aria-controls='collapseThree'>kompensieren.</a>";
    document.getElementById("compensateInfoText").innerHTML = compensateInfoText;

    return emissionUnit;
}

function setUnitPrefixForWeight(ammount) {
    if (ammount > 1000 || ammount < -1000) {
        ammount = Math.round(ammount * 100) / 100 / 1000;
        prefix = "t";
    } else if (ammount > -1000) {
        ammount = Math.round(ammount * 100) / 100;
        prefix = "kg";
    }
    return [ammount, prefix];
}

function updateBanners(
    lastTotalEm,
    lastGloEmCost,
    lastoldCurEmCost,
    emissionUnit
) {
    document.getElementById("bannerUnit").innerText = emissionUnit;

    $({numberValue: lastTotalEm}).animate(
        {numberValue: totalEm},
        {
            duration: 1200,
            easing: "swing",
            step: function (now) {
                $("#totalEmBanner").text(
                    now.toLocaleString("de-DE", {maximumFractionDigits: 1})
                );
            },
        }
    );

    $({numberValue: lastGloEmCost}).animate(
        {numberValue: gloEmCost},
        {
            duration: 1200,
            easing: "swing",
            step: function (now) {
                $("#gloCostBanner").text(
                    now.toLocaleString("de-DE", {maximumFractionDigits: 0})
                );
            },
        }
    );

    $({numberValue: lastoldCurEmCost}).animate(
        {numberValue: curEmCost},
        {
            duration: 1200,
            easing: "swing",
            step: function (now) {
                $("#curCostBanner").text(
                    now.toLocaleString("de-DE", {maximumFractionDigits: 0})
                );
            },
        }
    );
}

class obDataProperties {
    constructor(prodName, prodUnit, prodWeight, prodEmValues) {
        this.prodName = prodName;
        this.prodUnit = prodUnit;
        this.prodWeight = prodWeight;
        this.prodEmValues = prodEmValues;
    }
}
