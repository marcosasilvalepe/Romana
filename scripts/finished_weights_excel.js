"use strict";

const excel = require('exceljs');

const data = [
    {
      "line": "1",
      "weight_id": "29447",
      "cycle": "INTERNO",
      "created": "16-05-2022 14:45:22",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "20850",
      "tare": "9400",
      "net": "10280"
    },
    {
      "line": "2",
      "weight_id": "29445",
      "cycle": "DESPACHO",
      "created": "16-05-2022 11:03:12",
      "plates": "RCHR48",
      "driver": "Hernan Alvarado",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "3",
      "weight_id": "29444",
      "cycle": "RECEPCION",
      "created": "16-05-2022 09:01:24",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "44740",
      "tare": "15400",
      "net": "26290"
    },
    {
      "line": "4",
      "weight_id": "29443",
      "cycle": "RECEPCION",
      "created": "16-05-2022 08:29:50",
      "plates": "RCHR48",
      "driver": "Hernan Alvarado",
      "brute": "29370",
      "tare": "11610",
      "net": "16200"
    },
    {
      "line": "5",
      "weight_id": "29442",
      "cycle": "RECEPCION",
      "created": "14-05-2022 12:47:26",
      "plates": "FXJD42",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "6",
      "weight_id": "29441",
      "cycle": "DESPACHO",
      "created": "14-05-2022 10:32:16",
      "plates": "FXJD42",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "7",
      "weight_id": "29440",
      "cycle": "RECEPCION",
      "created": "14-05-2022 08:29:03",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "46490",
      "tare": "15360",
      "net": "28110"
    },
    {
      "line": "8",
      "weight_id": "29439",
      "cycle": "RECEPCION",
      "created": "13-05-2022 14:20:24",
      "plates": "FKPS29",
      "driver": "Rodolfo Villanueva",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "9",
      "weight_id": "29438",
      "cycle": "DESPACHO",
      "created": "13-05-2022 09:05:29",
      "plates": "FXJD42",
      "driver": "Miguel Ojeda Cruz",
      "brute": "48660",
      "tare": "15760",
      "net": "29660"
    },
    {
      "line": "10",
      "weight_id": "29437",
      "cycle": "DESPACHO",
      "created": "12-05-2022 15:31:28",
      "plates": "FKPS29",
      "driver": "Rodolfo Villanueva",
      "brute": "48500",
      "tare": "14810",
      "net": "30820"
    },
    {
      "line": "11",
      "weight_id": "29436",
      "cycle": "DESPACHO",
      "created": "12-05-2022 11:19:22",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "12",
      "weight_id": "29435",
      "cycle": "SERVICIO",
      "created": "12-05-2022 08:31:46",
      "plates": "DPJR82",
      "driver": "Chofer Externo",
      "brute": "52390",
      "tare": "17390",
      "net": "35000"
    },
    {
      "line": "13",
      "weight_id": "29434",
      "cycle": "RECEPCION",
      "created": "12-05-2022 08:25:04",
      "plates": "DCFD58",
      "driver": "Leonardo Silva",
      "brute": "38070",
      "tare": "15240",
      "net": "20260"
    },
    {
      "line": "14",
      "weight_id": "29433",
      "cycle": "RECEPCION",
      "created": "11-05-2022 17:40:52",
      "plates": "FKPS29",
      "driver": "Rodolfo Villanueva",
      "brute": "48570",
      "tare": "14810",
      "net": "30845"
    },
    {
      "line": "15",
      "weight_id": "29432",
      "cycle": "RECEPCION",
      "created": "11-05-2022 17:24:29",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "16",
      "weight_id": "29431",
      "cycle": "INTERNO",
      "created": "10-05-2022 16:30:59",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "16050",
      "tare": "9400",
      "net": "5795"
    },
    {
      "line": "17",
      "weight_id": "29430",
      "cycle": "INTERNO",
      "created": "10-05-2022 15:59:48",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "22360",
      "tare": "9400",
      "net": "11425"
    },
    {
      "line": "18",
      "weight_id": "29429",
      "cycle": "INTERNO",
      "created": "10-05-2022 15:14:38",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "23740",
      "tare": "9400",
      "net": "12730"
    },
    {
      "line": "19",
      "weight_id": "29428",
      "cycle": "DESPACHO",
      "created": "10-05-2022 09:46:37",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "53220",
      "tare": "15360",
      "net": "34620"
    },
    {
      "line": "20",
      "weight_id": "29427",
      "cycle": "RECEPCION",
      "created": "10-05-2022 08:37:17",
      "plates": "FFFL61",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "21430",
      "tare": "7670",
      "net": "12545"
    },
    {
      "line": "21",
      "weight_id": "29426",
      "cycle": "RECEPCION",
      "created": "10-05-2022 08:34:39",
      "plates": "YV6656",
      "driver": "Lenin Urzua",
      "brute": "43900",
      "tare": "14940",
      "net": "26290"
    },
    {
      "line": "22",
      "weight_id": "29425",
      "cycle": "INTERNO",
      "created": "09-05-2022 15:39:11",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "14850",
      "tare": "9400",
      "net": "4910"
    },
    {
      "line": "23",
      "weight_id": "29424",
      "cycle": "RECEPCION",
      "created": "09-05-2022 09:46:05",
      "plates": "FKPS29",
      "driver": "Rodolfo Villanueva",
      "brute": "14650",
      "tare": "10080",
      "net": "4165"
    },
    {
      "line": "24",
      "weight_id": "29423",
      "cycle": "RECEPCION",
      "created": "09-05-2022 09:41:11",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "25",
      "weight_id": "29422",
      "cycle": "INTERNO",
      "created": "09-05-2022 08:26:20",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "14510",
      "tare": "9400",
      "net": "4655"
    },
    {
      "line": "26",
      "weight_id": "29421",
      "cycle": "DESPACHO",
      "created": "07-05-2022 10:25:47",
      "plates": "FKPS29",
      "driver": "Rodolfo Villanueva",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "27",
      "weight_id": "29420",
      "cycle": "RECEPCION",
      "created": "07-05-2022 10:13:19",
      "plates": "FFFL61",
      "driver": "Miguel Ojeda Cruz",
      "brute": "27370",
      "tare": "7670",
      "net": "18080"
    },
    {
      "line": "28",
      "weight_id": "29419",
      "cycle": "INTERNO",
      "created": "06-05-2022 17:12:22",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "14370",
      "tare": "9400",
      "net": "4495"
    },
    {
      "line": "29",
      "weight_id": "29418",
      "cycle": "RECEPCION",
      "created": "06-05-2022 16:11:43",
      "plates": "FKPS29",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "30",
      "weight_id": "29417",
      "cycle": "RECEPCION",
      "created": "06-05-2022 16:10:43",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "31",
      "weight_id": "29416",
      "cycle": "INTERNO",
      "created": "06-05-2022 15:45:33",
      "plates": "INTERNO",
      "driver": "Deladier Guajardo",
      "brute": "930",
      "tare": "0",
      "net": "860"
    },
    {
      "line": "32",
      "weight_id": "29415",
      "cycle": "INTERNO",
      "created": "06-05-2022 15:36:05",
      "plates": "INTERNO",
      "driver": "Deladier Guajardo",
      "brute": "1130",
      "tare": "0",
      "net": "1025"
    },
    {
      "line": "33",
      "weight_id": "29414",
      "cycle": "DESPACHO",
      "created": "06-05-2022 08:05:38",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "47480",
      "tare": "15260",
      "net": "29430"
    },
    {
      "line": "34",
      "weight_id": "29413",
      "cycle": "RECEPCION",
      "created": "06-05-2022 07:48:30",
      "plates": "CCVH12",
      "driver": "Miguel Ojeda Cruz",
      "brute": "21320",
      "tare": "8100",
      "net": "12005"
    },
    {
      "line": "35",
      "weight_id": "29412",
      "cycle": "RECEPCION",
      "created": "06-05-2022 07:47:37",
      "plates": "FFFL61",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "26710",
      "tare": "7670",
      "net": "17420"
    },
    {
      "line": "36",
      "weight_id": "29411",
      "cycle": "INTERNO",
      "created": "05-05-2022 16:30:28",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "12530",
      "tare": "9400",
      "net": "2690"
    },
    {
      "line": "37",
      "weight_id": "29410",
      "cycle": "DESPACHO",
      "created": "05-05-2022 15:44:55",
      "plates": "FFFL61",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "38",
      "weight_id": "29409",
      "cycle": "DESPACHO",
      "created": "05-05-2022 15:44:23",
      "plates": "CCVH12",
      "driver": "Miguel Ojeda Cruz",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "39",
      "weight_id": "29408",
      "cycle": "DESPACHO",
      "created": "05-05-2022 15:05:05",
      "plates": "TRACTOR",
      "driver": "Sandro Sanguinetti",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "40",
      "weight_id": "29407",
      "cycle": "DESPACHO",
      "created": "04-05-2022 17:46:34",
      "plates": "FKPS29",
      "driver": "Rodolfo Villanueva",
      "brute": "55980",
      "tare": "14810",
      "net": "37690"
    },
    {
      "line": "41",
      "weight_id": "29406",
      "cycle": "RECEPCION",
      "created": "04-05-2022 15:20:40",
      "plates": "FKPS29",
      "driver": "Rodolfo Villanueva",
      "brute": "52740",
      "tare": "14810",
      "net": "34690"
    },
    {
      "line": "42",
      "weight_id": "29405",
      "cycle": "INTERNO",
      "created": "04-05-2022 10:59:01",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "12340",
      "tare": "9400",
      "net": "2600"
    },
    {
      "line": "43",
      "weight_id": "29404",
      "cycle": "INTERNO",
      "created": "04-05-2022 10:20:30",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "22580",
      "tare": "9400",
      "net": "12110"
    },
    {
      "line": "44",
      "weight_id": "29403",
      "cycle": "INTERNO",
      "created": "04-05-2022 09:07:17",
      "plates": "INTERNO",
      "driver": "Deladier Guajardo",
      "brute": "3010",
      "tare": "0",
      "net": "2590"
    },
    {
      "line": "45",
      "weight_id": "29402",
      "cycle": "DESPACHO",
      "created": "04-05-2022 08:31:45",
      "plates": "FKPS29",
      "driver": "Rodolfo Villanueva",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "46",
      "weight_id": "29401",
      "cycle": "DESPACHO",
      "created": "03-05-2022 17:50:26",
      "plates": "FXJD43",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "52460",
      "tare": "15360",
      "net": "33990"
    },
    {
      "line": "47",
      "weight_id": "29400",
      "cycle": "INTERNO",
      "created": "03-05-2022 16:57:45",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "17850",
      "tare": "9400",
      "net": "7180"
    },
    {
      "line": "48",
      "weight_id": "29399",
      "cycle": "RECEPCION",
      "created": "03-05-2022 16:18:31",
      "plates": "FKPS29",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "55330",
      "tare": "14810",
      "net": "37200"
    },
    {
      "line": "49",
      "weight_id": "29398",
      "cycle": "INTERNO",
      "created": "03-05-2022 16:11:03",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "18240",
      "tare": "9400",
      "net": "7570"
    },
    {
      "line": "50",
      "weight_id": "29397",
      "cycle": "DESPACHO",
      "created": "03-05-2022 11:12:54",
      "plates": "FKPS29",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "51",
      "weight_id": "29395",
      "cycle": "INTERNO",
      "created": "02-05-2022 15:22:14",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "18850",
      "tare": "9400",
      "net": "8450"
    },
    {
      "line": "52",
      "weight_id": "29394",
      "cycle": "DESPACHO",
      "created": "02-05-2022 09:31:27",
      "plates": "FKPS28",
      "driver": "Rodolfo Villanueva",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "53",
      "weight_id": "29393",
      "cycle": "RECEPCION",
      "created": "29-04-2022 08:43:45",
      "plates": "BLSZ12",
      "driver": "Rodolfo Villanueva",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "54",
      "weight_id": "29392",
      "cycle": "RECEPCION",
      "created": "29-04-2022 08:43:00",
      "plates": "BLSZ12",
      "driver": "Rodolfo Villanueva",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "55",
      "weight_id": "29391",
      "cycle": "RECEPCION",
      "created": "28-04-2022 16:02:54",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "56",
      "weight_id": "29390",
      "cycle": "DESPACHO",
      "created": "28-04-2022 15:57:03",
      "plates": "NX9882",
      "driver": "Daniel Bustamante",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "57",
      "weight_id": "29389",
      "cycle": "DESPACHO",
      "created": "27-04-2022 11:13:03",
      "plates": "BLSZ12",
      "driver": "Rodolfo Villanueva",
      "brute": "17710",
      "tare": "7760",
      "net": "9110"
    },
    {
      "line": "58",
      "weight_id": "29388",
      "cycle": "RECEPCION",
      "created": "27-04-2022 08:45:28",
      "plates": "FXJD42",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "59",
      "weight_id": "29387",
      "cycle": "RECEPCION",
      "created": "26-04-2022 16:56:55",
      "plates": "FKPS29",
      "driver": "Leonardo Calderon",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "60",
      "weight_id": "29386",
      "cycle": "RECEPCION",
      "created": "26-04-2022 16:49:03",
      "plates": "CCVH12",
      "driver": "Miguel Ojeda Cruz",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "61",
      "weight_id": "29385",
      "cycle": "RECEPCION",
      "created": "26-04-2022 16:46:01",
      "plates": "FFFL61",
      "driver": "Leonardo Calderon",
      "brute": "14070",
      "tare": "7670",
      "net": "4830"
    },
    {
      "line": "62",
      "weight_id": "29384",
      "cycle": "DESPACHO",
      "created": "26-04-2022 15:39:24",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "52250",
      "tare": "15360",
      "net": "33780"
    },
    {
      "line": "63",
      "weight_id": "29383",
      "cycle": "RECEPCION",
      "created": "26-04-2022 15:39:17",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "51580",
      "tare": "15360",
      "net": "33110"
    },
    {
      "line": "64",
      "weight_id": "29382",
      "cycle": "SERVICIO",
      "created": "26-04-2022 11:20:15",
      "plates": "DFDX97",
      "driver": "Chofer Externo",
      "brute": "4840",
      "tare": "3440",
      "net": "1400"
    },
    {
      "line": "65",
      "weight_id": "29381",
      "cycle": "RECEPCION",
      "created": "26-04-2022 10:19:11",
      "plates": "FKPS29",
      "driver": "Leonardo Calderon",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "66",
      "weight_id": "29380",
      "cycle": "RECEPCION",
      "created": "26-04-2022 10:14:36",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "67",
      "weight_id": "29379",
      "cycle": "SERVICIO",
      "created": "26-04-2022 09:57:36",
      "plates": "BVWD17",
      "driver": "Chofer Externo",
      "brute": "5310",
      "tare": "3720",
      "net": "1590"
    },
    {
      "line": "68",
      "weight_id": "29378",
      "cycle": "RECEPCION",
      "created": "26-04-2022 08:34:56",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "69",
      "weight_id": "29377",
      "cycle": "DESPACHO",
      "created": "26-04-2022 08:30:37",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "70",
      "weight_id": "29375",
      "cycle": "INTERNO",
      "created": "25-04-2022 18:44:00",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "12590",
      "tare": "9400",
      "net": "2860"
    },
    {
      "line": "71",
      "weight_id": "29374",
      "cycle": "INTERNO",
      "created": "25-04-2022 17:02:44",
      "plates": "KT7379",
      "driver": "Deladier Guajardo",
      "brute": "14920",
      "tare": "9400",
      "net": "4850"
    },
    {
      "line": "72",
      "weight_id": "29373",
      "cycle": "DESPACHO",
      "created": "25-04-2022 16:06:37",
      "plates": "KWGL53",
      "driver": "Felipe Pacheco",
      "brute": "48230",
      "tare": "14850",
      "net": "30090"
    },
    {
      "line": "73",
      "weight_id": "29372",
      "cycle": "SERVICIO",
      "created": "25-04-2022 14:25:20",
      "plates": "GLKP84",
      "driver": "Chofer Externo",
      "brute": "5710",
      "tare": "4370",
      "net": "1340"
    },
    {
      "line": "74",
      "weight_id": "29371",
      "cycle": "DESPACHO",
      "created": "25-04-2022 12:06:13",
      "plates": "RKLH76",
      "driver": "Cesar Cavieres",
      "brute": "50390",
      "tare": "15250",
      "net": "31780"
    },
    {
      "line": "75",
      "weight_id": "29370",
      "cycle": "SERVICIO",
      "created": "25-04-2022 11:26:40",
      "plates": "BVWD17",
      "driver": "Chofer Externo",
      "brute": "5020",
      "tare": "3720",
      "net": "1300"
    },
    {
      "line": "76",
      "weight_id": "29369",
      "cycle": "DESPACHO",
      "created": "25-04-2022 11:09:14",
      "plates": "FXJD42",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "51590",
      "tare": "15200",
      "net": "33250"
    },
    {
      "line": "77",
      "weight_id": "29368",
      "cycle": "RECEPCION",
      "created": "25-04-2022 11:07:16",
      "plates": "FXJD42",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "51090",
      "tare": "15200",
      "net": "32750"
    },
    {
      "line": "78",
      "weight_id": "29367",
      "cycle": "SERVICIO",
      "created": "25-04-2022 09:24:44",
      "plates": "BVWD17",
      "driver": "Chofer Externo",
      "brute": "4680",
      "tare": "3730",
      "net": "950"
    },
    {
      "line": "79",
      "weight_id": "29366",
      "cycle": "DESPACHO",
      "created": "25-04-2022 07:42:08",
      "plates": "FXJD42",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "80",
      "weight_id": "29365",
      "cycle": "DESPACHO",
      "created": "23-04-2022 11:15:20",
      "plates": "RKLH76",
      "driver": "Cesar Cavieres",
      "brute": "54190",
      "tare": "14990",
      "net": "35830"
    },
    {
      "line": "81",
      "weight_id": "29363",
      "cycle": "DESPACHO",
      "created": "23-04-2022 10:48:19",
      "plates": "FFFL61",
      "driver": "Miguel Ojeda Cruz",
      "brute": "13990",
      "tare": "7670",
      "net": "5665"
    },
    {
      "line": "82",
      "weight_id": "29362",
      "cycle": "DESPACHO",
      "created": "23-04-2022 10:36:00",
      "plates": "FKPS29",
      "driver": "Leonardo Calderon",
      "brute": "52550",
      "tare": "14810",
      "net": "34400"
    },
    {
      "line": "83",
      "weight_id": "29361",
      "cycle": "RECEPCION",
      "created": "23-04-2022 09:44:15",
      "plates": "FFFL61",
      "driver": "Miguel Ojeda Cruz",
      "brute": "16030",
      "tare": "7670",
      "net": "7115"
    },
    {
      "line": "84",
      "weight_id": "29359",
      "cycle": "DESPACHO",
      "created": "22-04-2022 19:01:17",
      "plates": "FYWS75",
      "driver": "Cristian Ahumada",
      "brute": "49910",
      "tare": "15060",
      "net": "31650"
    },
    {
      "line": "85",
      "weight_id": "29358",
      "cycle": "DESPACHO",
      "created": "22-04-2022 18:47:17",
      "plates": "KWGL53",
      "driver": "Felipe Pacheco",
      "brute": "49700",
      "tare": "14800",
      "net": "31580"
    },
    {
      "line": "86",
      "weight_id": "29357",
      "cycle": "DESPACHO",
      "created": "22-04-2022 18:15:28",
      "plates": "BLSZ12",
      "driver": "Rodolfo Villanueva",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "87",
      "weight_id": "29356",
      "cycle": "DESPACHO",
      "created": "22-04-2022 16:18:07",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "52810",
      "tare": "15360",
      "net": "34280"
    },
    {
      "line": "88",
      "weight_id": "29355",
      "cycle": "RECEPCION",
      "created": "22-04-2022 16:17:58",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "52810",
      "tare": "15360",
      "net": "34280"
    },
    {
      "line": "89",
      "weight_id": "29353",
      "cycle": "RECEPCION",
      "created": "22-04-2022 14:45:28",
      "plates": "FKPS29",
      "driver": "Leonardo Calderon",
      "brute": "48910",
      "tare": "14810",
      "net": "30750"
    },
    {
      "line": "90",
      "weight_id": "29352",
      "cycle": "RECEPCION",
      "created": "22-04-2022 10:31:13",
      "plates": "BDLF14",
      "driver": "Marco Blanca",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "91",
      "weight_id": "29351",
      "cycle": "DESPACHO",
      "created": "22-04-2022 09:52:44",
      "plates": "FKPS28",
      "driver": "Miguel Ojeda Cruz",
      "brute": "24520",
      "tare": "10110",
      "net": "13010"
    },
    {
      "line": "92",
      "weight_id": "29350",
      "cycle": "DESPACHO",
      "created": "22-04-2022 09:35:34",
      "plates": "FKPS29",
      "driver": "Leonardo Calderon",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "93",
      "weight_id": "29349",
      "cycle": "DESPACHO",
      "created": "22-04-2022 08:21:11",
      "plates": "FXJD43",
      "driver": "Brian Munoz",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "94",
      "weight_id": "29348",
      "cycle": "RECEPCION",
      "created": "21-04-2022 18:23:56",
      "plates": "BDLF14",
      "driver": "Marco Blanca",
      "brute": "0",
      "tare": "0",
      "net": "0"
    },
    {
      "line": "95",
      "weight_id": "29347",
      "cycle": "RECEPCION",
      "created": "21-04-2022 17:46:21",
      "plates": "FFFL61",
      "driver": "Miguel Ojeda Cruz",
      "brute": "11960",
      "tare": "7670",
      "net": "3360"
    },
    {
      "line": "96",
      "weight_id": "29346",
      "cycle": "RECEPCION",
      "created": "21-04-2022 17:36:54",
      "plates": "FKPS28",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "21910",
      "tare": "10110",
      "net": "10615"
    },
    {
      "line": "97",
      "weight_id": "29345",
      "cycle": "DESPACHO",
      "created": "21-04-2022 17:18:29",
      "plates": "FXJD42",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "50470",
      "tare": "15200",
      "net": "32140"
    },
    {
      "line": "98",
      "weight_id": "29344",
      "cycle": "RECEPCION",
      "created": "21-04-2022 17:17:54",
      "plates": "FXJD42",
      "driver": "Gonzalo Ojeda Gomez",
      "brute": "50020",
      "tare": "15200",
      "net": "31690"
    },
    {
      "line": "99",
      "weight_id": "29343",
      "cycle": "DESPACHO",
      "created": "21-04-2022 14:59:25",
      "plates": "HRWJ85",
      "driver": "Lisandro Muñoz",
      "brute": "45700",
      "tare": "15870",
      "net": "27130"
    },
    {
      "line": "100",
      "weight_id": "29342",
      "cycle": "RECEPCION",
      "created": "21-04-2022 14:27:40",
      "plates": "CCVH12",
      "driver": "Miguel Ojeda Cruz",
      "brute": "0",
      "tare": "0",
      "net": "0"
    }
];

(async () => {
    try {

        const font = 'Calibri';

        const workbook = new excel.Workbook();

        const sheet = workbook.addWorksheet('Hoja1', {
            pageSetup:{
                paperSize: 9, 
                orientation:'portrait'
            }
        });
        
        sheet.columns = [
            { header: 'Nº', key: 'line' },
            { header: 'PESAJE', key: 'weight_id' },
            { header: 'CICLO', key: 'cycle' },
            { header: 'FECHA', key: 'created' },
            { header: 'VEHICULO', key: 'plates' },
            { header: 'CHOFER', key: 'driver' },
            { header: 'BRUTO', key: 'brute' },
            { header: 'TARA', key: 'tare' },
            { header: 'NETO', key: 'net' }
        ]
        
        for (let i = 0; i < data.length; i++) {
        
            const line_cell = sheet.getCell(`A${i + 2}`);
            line_cell.value = parseInt(data[i].line);
            line_cell.font = {
                name: font,
                size: 11
            }
            line_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            line_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            line_cell.numFmt = '#,##0;[Red]#,##0';
        
            const weight_cell = sheet.getCell(`B${i + 2}`);
            weight_cell.value = parseInt(data[i].weight_id);
            weight_cell.font = {
                name: font,
                size: 11
            }
            weight_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            weight_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        
            const cycle_cell = sheet.getCell(`C${i + 2}`);
            cycle_cell.value = data[i].cycle;
            cycle_cell.font = {
                name: font,
                size: 11
            }
            cycle_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            cycle_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        
            const date_cell = sheet.getCell(`D${i + 2}`);
            date_cell.value = data[i].created;
            date_cell.font = {
                name: font,
                size: 11
            }
            date_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            date_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        
            const plates_cell = sheet.getCell(`E${i + 2}`);
            plates_cell.value = data[i].plates;
            plates_cell.font = {
                name: font,
                size: 11
            }
            plates_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            plates_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        
            const driver_cell = sheet.getCell(`F${i + 2}`);
            driver_cell.value = data[i].driver;
            driver_cell.font = {
                name: font,
                size: 11
            }
            driver_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            driver_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        
            const brute_cell = sheet.getCell(`G${i + 2}`);
            brute_cell.value = parseInt(data[i].brute);
            brute_cell.font = {
                name: font,
                size: 11
            }
            brute_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            brute_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            brute_cell.numFmt = '#,##0;[Red]#,##0';
        
            const tare_cell = sheet.getCell(`H${i + 2}`);
            tare_cell.value = parseInt(data[i].tare);
            tare_cell.font = {
                name: font,
                size: 11
            }
            tare_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            tare_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            tare_cell.numFmt = '#,##0;[Red]#,##0';
        
            const net_cell = sheet.getCell(`I${i + 2}`);
            net_cell.value = parseInt(data[i].net);
            net_cell.font = {
                name: font,
                size: 11
            }
            net_cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            net_cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            net_cell.numFmt = '#,##0;[Red]#,##0';
        
        }

        //FORMAT FIRST ROW
        const header_row = sheet.getRow(1);
        for (let i = 1; i < 10; i++) {
            header_row.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            header_row.getCell(i).alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            header_row.getCell(i).font = {
                bold: true,
                size: 11,
                name: font
            }
        }

        sheet.columns.forEach(column => {
            let dataMax = 0;
            column.eachCell({ includeEmpty: false }, cell => {
                let columnLength = cell.value.length + 3;	
                if (columnLength > dataMax) {
                    dataMax = columnLength;
                 }
            });
            column.width = (dataMax < 5) ? 5 : dataMax;
        });

        /*
        for (let i = 0; i < sheet.columns.length; i++) { 

            let dataMax = 0;
            const column = sheet.columns[i];

            for (let j = 1; j < column.values.length; j++) {

                const columnLength = column.values[j].length;
                if (columnLength > dataMax) dataMax = columnLength;
                
            }

            column.width = dataMax < 10 ? 10 : dataMax;
          }
          */

        await workbook.xlsx.writeFile('export_weights.xlsx');

    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();