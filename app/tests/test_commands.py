import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'credsec.settings' 
import django
django.setup()

import pytest
from unittest.mock import Mock
from unittest.mock import patch
from django.core.management import call_command
from django.test import TestCase
from app.models import MainData, Relation, Tagsh, ContentLine  # import your models here



@pytest.mark.django_db
class TestIntelxImportCommand(TestCase):
    def setUp(self):
        self.search_term = 'test_term'
        self.maxresults = 10

        # Mock intelx object and its methods
        self.intelx_obj = Mock()
        self.intelx_obj.search.return_value = {'records': [
            {
            "systemid": "6d94ed77-7a94-4a52-a4d3-317aa4d4314c",
            "owner": "00000000-0000-0000-0000-000000000000",
            "storageid": "62a0a63e189e526e08d157e80ddba226be030cb7a440a50c94e600d41ca2e2d56870ad6ad95f2df48f410e244aec8bbe7fd801e437b8e426e9523c0f420d389f",
            "instore": True,
            "size": 4194303,
            "accesslevel": 0,
            "type": 1,
            "media": 24,
            "added": "2019-12-27T18:17:04.410745Z",
            "date": "2019-12-27T18:16:50.440124Z",
            "name": "Exploit.in/9.txt [Part 35 of 64]",
            "description": "",
            "xscore": 63,
            "simhash": 9831917760971126189,
            "bucket": "leaks.public.general",
            "keyvalues": None,
            "tags": None,
            "relations": [
                {
                    "target": "9e99fbc1-8216-43ef-b3cf-6ad6b1fb076d",
                    "relation": 7
                }
            ],
            "accesslevelh": "Public",
            "mediah": "Text File",
            "simhashh": "8871fd1ca389b5ad",
            "typeh": "Text",
            "tagsh": [
                {
                    "class": 4,
                    "classh": "Leak",
                    "value": "email",
                    "valueh": "E-Mail"
                }
            ],
            "randomid": "dd816d9a-9616-4a68-af24-a4133ef2cb85",
            "bucketh": "Leaks \u00bb Public \u00bb General",
            "indexfile": "4109ddb460bfe78e45319d76b8764495308fd7f70836a296ec6717987e87510b1a64eedd437160a7bfd67eca254726678a807f35a7cb66a2321091fcc9dd6222",
            "historyfile": "",
            "perfectmatch": False,
            "group": "4109ddb460bfe78e45319d76b8764495308fd7f70836a296ec6717987e87510b1a64eedd437160a7bfd67eca254726678a807f35a7cb66a2321091fcc9dd6222"
        },
        {
            "systemid": "ff3a02f0-9340-429f-ad0d-397eed19423b",
            "owner": "00000000-0000-0000-0000-000000000000",
            "storageid": "ef1e9343f53b8829d6e6771356d3d79e6bc01e7cd1263ae2eb38f76919f1a8d929e58238971ea502f2ea195a5e0a8ecb467dffcb29d8f710b6fc95b9e89376ed",
            "instore": True,
            "size": 4194304,
            "accesslevel": 0,
            "type": 1,
            "media": 24,
            "added": "2019-12-04T18:05:49.833992Z",
            "date": "2019-12-04T18:04:21.57961Z",
            "name": "Adobe October 2013.txt [Part 502 of 1973]",
            "description": "",
            "xscore": 63,
            "simhash": 9832427935425471932,
            "bucket": "leaks.public.general",
            "keyvalues": None,
            "tags": None,
            "relations": [
                {
                    "target": "1932ba9b-3252-488c-9dfd-9cbdba6aec45",
                    "relation": 7
                }
            ],
            "accesslevelh": "Public",
            "mediah": "Text File",
            "simhashh": "8873cd1ce2a9a5bc",
            "typeh": "Text",
            "tagsh": [
                {
                    "class": 4,
                    "classh": "Leak",
                    "value": "email",
                    "valueh": "E-Mail"
                }
            ],
            "randomid": "62356671-5eb4-46fb-9055-a70964bd37f2",
            "bucketh": "Leaks \u00bb Public \u00bb General",
            "indexfile": "dba14babb65e02fde7371bf0638d4737533b718fd2a2cb03eb0ed5b54d5653d6b4f3c59960000f81772f1be25a4818560a9ae5cbd65280357bc8902527257dcf",
            "historyfile": "",
            "perfectmatch": False,
            "group": "dba14babb65e02fde7371bf0638d4737533b718fd2a2cb03eb0ed5b54d5653d6b4f3c59960000f81772f1be25a4818560a9ae5cbd65280357bc8902527257dcf"
        },
        {
            "systemid": "434bb188-16e5-40af-9e4f-cee458310cde",
            "owner": "00000000-0000-0000-0000-000000000000",
            "storageid": "ad5bed1705f2d454388686a952d69cce5d35099517c71051c0cfbd0d28b5da01ed808d28fb6ce5f2510ba1f9144bef6a6eac69e54fcfffda7f176f5e08a98961",
            "instore": True,
            "size": 4194257,
            "accesslevel": 0,
            "type": 1,
            "media": 24,
            "added": "2019-12-03T18:18:37.374526Z",
            "date": "2019-12-03T18:18:25.998912Z",
            "name": "linkedin.txt [Part 57 of 2708]",
            "description": "",
            "xscore": 63,
            "simhash": 10332310106481473469,
            "bucket": "leaks.public.general",
            "keyvalues": None,
            "tags": None,
            "relations": [
                {
                    "target": "5e0c51cb-8b29-4076-9051-e1917b52f8e7",
                    "relation": 7
                }
            ],
            "accesslevelh": "Public",
            "mediah": "Text File",
            "simhashh": "8f63bd4c8601b7bd",
            "typeh": "Text",
            "tagsh": [
                {
                    "class": 0,
                    "classh": "Language",
                    "value": "en",
                    "valueh": "English"
                },
                {
                    "class": 4,
                    "classh": "Leak",
                    "value": "email",
                    "valueh": "E-Mail"
                }
            ],
            "randomid": "d0a56eec-ae81-43ae-8153-7dd55438bc23",
            "bucketh": "Leaks \u00bb Public \u00bb General",
            "indexfile": "26b92bb5a390c01c784ecdc4697965f282dea068ce9155feba39e43fe649598c8ec6be5f22fe974cdd3351668557e4c19efee72935d25ba26f57986cc0a5a77f",
            "historyfile": "",
            "perfectmatch": False,
            "group": "26b92bb5a390c01c784ecdc4697965f282dea068ce9155feba39e43fe649598c8ec6be5f22fe974cdd3351668557e4c19efee72935d25ba26f57986cc0a5a77f"
        },
        {
            "systemid": "3a34219b-f241-48ae-8d7b-ff9112d4ba1d",
            "owner": "00000000-0000-0000-0000-000000000000",
            "storageid": "90694bab1e4e69fbf7080991b69ad53f777453f08a94d739d626c99c44f5fc471e53d77d9fb6b3e4a68441a835bd35d302150292a203ab4bbfc35ebc530f18ff",
            "instore": True,
            "size": 4194278,
            "accesslevel": 0,
            "type": 1,
            "media": 24,
            "added": "2019-11-21T21:20:32.384145Z",
            "date": "2019-11-21T21:20:18.002074Z",
            "name": "myfitnesspal.txt [Part 142 of 1094]",
            "description": "",
            "xscore": 61,
            "simhash": 11008300645902558540,
            "bucket": "leaks.public.general",
            "keyvalues": None,
            "tags": None,
            "relations": [
                {
                    "target": "0ad046bb-2ed7-460c-a796-e7994db2c722",
                    "relation": 7
                }
            ],
            "accesslevelh": "Public",
            "mediah": "Text File",
            "simhashh": "98c5571cebb9a54c",
            "typeh": "Text",
            "tagsh": [
                {
                    "class": 0,
                    "classh": "Language",
                    "value": "en",
                    "valueh": "English"
                },
                {
                    "class": 4,
                    "classh": "Leak",
                    "value": "email",
                    "valueh": "E-Mail"
                }
            ],
            "randomid": "0c91d45d-cd2d-4820-98d2-809c94ba196f",
            "bucketh": "Leaks \u00bb Public \u00bb General",
            "indexfile": "08b9a9aa8a9d27f6371886384b65dc80c1c07229b0dce9b059a527dcf82c9416c15e8428a8c3ec5aeefbff6dd24c107f4a21c513e867984c5695f0bd97e99f26",
            "historyfile": "",
            "perfectmatch": False,
            "group": "08b9a9aa8a9d27f6371886384b65dc80c1c07229b0dce9b059a527dcf82c9416c15e8428a8c3ec5aeefbff6dd24c107f4a21c513e867984c5695f0bd97e99f26"
        },
        {
            "systemid": "fc1e9342-e152-4686-906a-65d1837c68ae",
            "owner": "00000000-0000-0000-0000-000000000000",
            "storageid": "fa6a63e7a12f919f9d8095b7264b0d1064f41caa0c35af53d5ecc4637b1be9a93ae15f505837da7978e3d078e8a27b4dc4ff0cd6ba166bcb011157d1b1c1435b",
            "instore": True,
            "size": 4194290,
            "accesslevel": 0,
            "type": 1,
            "media": 24,
            "added": "2020-01-20T14:08:53.432845Z",
            "date": "2016-02-20T06:15:34Z",
            "name": "nuclearleaks/unverified/gmail.zip/gmail.txt [Part 32 of 38]",
            "description": "",
            "xscore": 69,
            "simhash": 9831917760971126189,
            "bucket": "leaks.public.general",
            "keyvalues": None,
            "tags": None,
            "relations": [
                {
                    "target": "9776b87a-94a0-4558-bdda-e82290519f03",
                    "relation": 8
                }
            ],
            "accesslevelh": "Public",
            "mediah": "Text File",
            "simhashh": "8871fd1ca389b5ad",
            "typeh": "Text",
            "tagsh": [
                {
                    "class": 4,
                    "classh": "Leak",
                    "value": "email",
                    "valueh": "E-Mail"
                }
            ],
            "randomid": "9a25a451-b002-4f67-9c92-b0744d9e7011",
            "bucketh": "Leaks \u00bb Public \u00bb General",
            "indexfile": "8b1e32747e5d109a4bb4d0e8c69f540ee259b0a753c854f395b0868a1e09035d61961cdd06282de3e3d609ed750356035d9a50a8b9496d6fe2c1f4ea33ff2f47",
            "historyfile": "",
            "perfectmatch": False,
            "group": "8b1e32747e5d109a4bb4d0e8c69f540ee259b0a753c854f395b0868a1e09035d61961cdd06282de3e3d609ed750356035d9a50a8b9496d6fe2c1f4ea33ff2f47"
        }
        ]}
        self.intelx_obj.FILE_VIEW.return_value = 'contents'

        # Patch the intelx method to return the mock
        patcher = patch('app.management.commands.intelximp.Command', return_value=self.intelx_obj)
        self.addCleanup(patcher.stop)
        patcher.start()

    def test_command_creates_main_data(self):
        call_command('intelximp', self.search_term, self.maxresults)

        assert MainData.objects.count() == len(self.intelx_obj.search.return_value)
        
    # similar tests for Relation, Tagsh and ContentLine models
