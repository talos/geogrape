addSubboroughs = function(map) {
/*    if (GBrowserIsCompatible()) {
	if(!map) {
	    //	      window.console.log('no map');
	    map = new GMap2(document.getElementById("map_canvas")); 
	    map.setCenter(new GLatLng(40.745176490485022,-73.937261107734685),11);
	    map.setUIToDefault();
	    
	} else {
	    map.removeOverlay(curOverlay);
	}*/
//	window.console.log(subboroughs_json);
//for(polyName in subboroughs_json) {
//   var polyData = subboroughs_json[polyName];
var subboroughPolys = [];
for(polyId in subboroughs_json) {
   var polyData = subboroughs_json[polyId];

    var polylines = [];
    for(var i = 1; i + 1 < polyData.length; i += 2) { // count polyline data in pairs.
	polylines.push(
        {points: polyData[i],
	 levels: polyData[i+1],
	 color: '#000000',
	 opacity: 1,
	 weight: 2,
	 numLevels: 11,
	 zoomFactor: 2}
	);
    }
   
   var subboroughPoly = new GPolygon.fromEncoded({
       polylines: polylines,
       fill: false,
       color: '#61c982',
       opacity: 0,
       outline: true
    });
    subboroughPoly.geograpePolyId = polyId; // possibly not the greatest idea.
    subboroughPoly.geograpePolyName = polyData[0]; // polyName stored in the first element of data array.
    subboroughPolys.push(subboroughPoly);
    map.addOverlay(subboroughPoly);
    GEvent.addListener(subboroughPoly, 'mouseover', function() {
       this.setStrokeStyle({
	   weight: 4,
	   color: '#ff0000'
       });
    });
    GEvent.addListener(subboroughPoly, 'mouseout', function() {
       this.setStrokeStyle({
	   weight: 2,
	   color: '#000000'
       });
    });
//    GEvent.addListener(subboroughPoly, 'click', function() {
//	this.fire('Geogrape:selected');
//	GEvent.trigger(this, 'Geogrape:selected');
//    });
}
    GEvent.addListener(map, 'mouseout', function(subboroughPolys) {
	subboroughPolys.each(function(subboroughPoly) {
	    subboroughPoly.setStrokeStyle({
		weight: 2,
		color: '#000000'
	    });
	});
    }.curry(subboroughPolys));

    return subboroughPolys;
/*GEvent.addListener(map, 'click', function(overlay) {
   overlay.setFillStyle({opacity: .5});
});*/
}

var subboroughs_json = {
    "401":['Astoria', "of}wFbjabMyKyJdYaj@bPdGr[gPvJlMjOkU~CkTvg@oLhAde@ld@r_@z@zOge@|Kl_@bZjCiHbj@nWmEfm@lHrh@lDd|@xOzToa@phAbApVwu@}s@sI_As[y^s@kWaKmDkCfQwLz@kZ{NxIyl@cn@maAkMcEeVge@zPib@","IEGEEFDFIEEGGEEGECEFEIDCEGEEEGFDDFI","mm_xFde~aM`QgYhEs]jM{YlU{ThJf@lFrq@sIn}@qd@rYuZyLaCqT","IDDEDHEGFEI"],
    "402":['Sunnyside/Woodside', "y~wwF|x`bM`DwQ``@jAn`@aLlN{`@dV{C}@eOtSeOiHsUjTaOvZtYuGdlAjAhYhf@bb@za@`s@rScOtM|fA{a@jFua@~[eFnc@mMbYuVpMa]fqArQlo@qU}@eT_UsItAyp@ob@cAqVna@qhAyO{TmDe|@mHsh@lEgm@cj@oWkChHm_@cZh^aJ","IEDFEEEEEIFCGDFIGEFDEGFIEDDHEGECEGEEGI"],
    "403":['Jackson Heights',"clzwFzq~aMoRve@wJmMf^iW","IGFI","clzwFzq~aMsAie@od@zEiCib@_LsBbGuViZyUxMaLvNbRhq@_cB~RfJxDiHxLvZ{Xdd@tGfFbL}Rpi@{d@xDiRzYwL`B|Jfa@sFtVfsAiYhH`Mn|BUrPeMd[ys@rPiY_N{WqWiAee@si@nQ","IFFEEFIEFGEEFEHDDFEEIFFEDIFDFGI"],
    "404":['Elmhurst/Corona',"ygrwF~a|aM~MrUzAte@q_@tENs\\dMke@","IEFHDI","ygrwF~a|aMyXzRcOeGkT`OhHrUuSdO|@dOeVzCsMmhChYiHuVgsAga@rFaB}J{YvLyDhRqi@zd@cL|RuGgFzXed@|c@kf@s@og@eXkd@yCoTjV}Ixi@rQnAuMxQ}McBgT~WdDvc@tYxp@}Ejq@gd@|EeOdo@{K`Jv[_Xd^eq@pYgYvYej@pSnDn_@hUfmAAbQdTxn@uD`M","IDEFFEEIFFHEEFDDEICGEDIEGDEGDFGDEIFGDDHCCDEI","cvqwFxotaMkk@{@{OfTjRvGzh@c[","IEHEI","kjpwFhtsaMrIcQ{YwBoKvLzEbLzT_D","IFEFEI"],
    "405":['Middle Village/Ridgewood',"a~rwFzo_bMfBqg@zc@_G{Aue@gLkYvKs`@|\\_Lx{@qy@rl@yAdJyE}EqUj[}McFxcAtBzc@n_@dIzKaGhF`^pW|k@bk@zcAmJfHpSjOed@l\\cYxBiLbVeIuGyX`k@iUtAsb@ny@wWdCeM`MoJmGgNagAsSbO{a@as@if@cb@w@__@","IFFDEGEFDFFIDGEGDCEEIEEEFEEEDIEFFDEI"],
    "406":['Forest Hills/Rego Park',"uiswFl_vaMtXmIja@a`@dq@qY~We^tVpf@pQtl@lAnd@~Nnu@eJxEsl@xAy{@py@}\\~KcDdOoLiGiJoq@iUgmAoDo_@jHyB","IDDEICEDIDFEEIEBEEI"],
    "407":['Flushing/Whitestone',"{v_xFhzpaMjWoi@`@w~@hIso@zScBtLcV{J{x@}XjAyCm_@fGcLzn@_YtB|Tll@uj@|Mbq@_IjAdb@z|BtNuNfc@hDjWwBc@wOjRmANv[tj@a@`GhOtKyOtQkAdOpPrSiCiCbrB`D[cG~|@|Kna@q\\lG{AfZwSeCcJwL_XeDbBfTe[fPwa@}IoZlMhFbi@}EpMkW`Mwd@cK{e@pGcAf`@kUpLoU_]_N~H_NcGbGkRsIst@mIgWvj@sPGiU_SuOeW~CqFs^eQ{V","IEDFEGEFHDFEIEDHEDEEGFEEDFEIDDEIFFDDFEFEGDGEEGEIEEGECGFGEFDI"],
    "408":['Hillcrest/Fresh Meadows',"}~twFfsfaMCiErt@yXfOe@bBhMt}@o|@~WoN~Kf^iHfEvRhm@mFzCjPfq@~NdcAR~WzPrs@iH|C|Mt[pNqGzErX{OlFdHz^|Ta@k@fY_}@b_@QzJk\\fMeo@zK}EdOkq@fd@yp@|E_A_c@p\\mG}Koa@bG_}@aDZhCcrBck@gsD","IDFEFDIDEDECCDEFEFEEFIFEFCFDEIFFEDDGI"],
    "409":['Kew Gardens/Woodhaven',"kbowFhwqaMxQ_Sht@i]rb@iKlf@}Uho@hlDjMyE|C`SmMzCpVrlAv@b]aGnBxGn[wQ`ChAdKorAjRkNfHo_@eIuB{c@xDir@aZqAaH}^mAod@qb@enAsE}g@","IDCDIEEGEEDDEEIDEHDFFCDDI"],
    "410":['Howard Beach/S. Ozone Park',"qziwFlsnaM|wA}j@zm@wHDk_A`RtBwB~b@jLhY{MjNUrSbZdIyL`m@gI`wAhCbQ~f@wR|w@oMmAzx@rQnApC|\\}Axp@}n@`x@gZxPoSgPmOzBiBePeq@rKnA|Ooo@tJoBmu@qVslAlM{C}CaSkMxEio@ilDrSiM","IEGFIEEDFFDDHDGFHCFIFEEFEEIDEEFEFI"],
    "411":['Bayside/Little Neck',"c_ywFj`~`M~c@wy@tG~^p[bUlFnNhp@r`@h_@nn@te@pk@re@ft@_A|Yqd@bf@cBiMgOd@st@xXxFdh@lc@jpCsShCeOqPuQjAuKxOaGiOuj@`@Ow[kRlAb@vOkWvBgc@iDuNtNeb@{|B~HkA}Mcq@fc@mPhe@kc@vG_Xgc@~BgCsIoWjIk`@cPsE{KddAikBhb@sy@","IHEDDECCIEFEFHBIEFDEEFGEEDEIDEHEEHEEFDHBI"],
    "412":['Jamaica',"kqowFnrdaM|^qV`l@eRbBbIz|@eRwCu^vTfHjs@vd@ns@t\\jx@pJ_HnvA~Dd_BJxmA{m@vHm_Ah]qsAzq@}YnIj@gY}T`@eH{^zOmF{EsXqNpG}Mu[hH}C{Pss@S_X_OecAkPgq@lF{CwRim@hHgE","IDEEFHCCEIECIEDCIEFFEFEFEDCCEDEI"],
    "413":['Bellerose/Rosedale',"iawwFd}z`Mp[cj@~nAuDrfAlo@bJt`A~Kdq@xJpX|dAaUz~@aE~WpCjqBoA`VvIpjAbD~X{Lne@cFjLby@~Nfh@px@jFjDf`@hLhH`c@n{AhQdVlPy@|J|M?fTw[RoZxaAg^tq@ku@b_Cs]by@{c@jHg@vGbe@_D?nKaq@rP_g@vRiCcQfIawAxLam@cZeITsShV|LyTsv@vB_c@aRuBqEsmB~GovAkx@qJos@u\\ks@wd@wTgHvCt^{|@dRcBcIal@dR}^pV_Lg^iTdTwNzCeMw]}C|Eq]qk@ue@qk@i_@on@ip@s`@mFoNq[cUuG__@xWmg@","IFHGDCHDFDEDFDICFGDDFDEIFECDCFGEEICHDDFFFFEFFDIECCHFEEDFFDIDECCFDDGEI"],
    "414":['Rockaways',"y{wvFhftaM`JcBjOa`@nW|KmDbc@{PdBIle@aXkIgBck@","IDFGEEGFI","sdxvF|coaMcQfYcQbB_Ic[jWeGzT|E","IEGFDI","gazvFtykaM~WbQoAfm@{OjC{ToUSoPzOw[","IFEHFDI","olzvFdisaMlOmK|ExLwVnKJ{L","IEFEI","_j{vFbsfaMbLsNdNs{@{Ooi@jCaMje@cZhKyRtn@tA|Dvj@zVrn@|@|aAqCje@zAvd@tRfmAfP~oBhm@hkDjYvoAfGtD`W`gAzLf]l\\jxAjRvtA|C`hAtg@zvBjUlg@nTh|@gw@eIcMmLaI}\\mYoIeI_vAuLsX~Hkg@uCgd@_]ig@pDgTsB{}@{X}y@aQeK_Ck[ac@gbAsBgTfCe|@iQ_eA}Cg@uQq|@}^i{@kd@qXe@}fAmW_d@`FkEpSfZnNeCsi@ig@cGzEc`@w`@z@sXbQsIn`@fNpX_PqF_Quc@jEw[aIqKxYgOeBc@kd@","IDFDGDFIDECCEDGCEDCBFDEDDIFDEHEEDFEDGEDDFCFCDFEFEGEEGEDHEFFHEEFEGI","sp|vFhpfaMv`@_D{Evo@k\\sb@nAcG","IFGDI","ow|vFdagaMb`@rb@_D~Cc[kR?gT","IDGEI","yg}vFxckaMpKy[nFxBbj@sg@nUni@vVz^sXrXsDjW_SbBgm@ka@{J?AoZ","IEDHCHEEGDFI","c`~vFxplaM`RsNxFnPr{@b[f@~MsN{@w`@bQoPwB{OgY_Dg^","IFEEHDDGDI","_l~vFlpoaMj\\{JfEbQ{OfOwQoU","IFGFI","cr_wFhiqaMfJcLjWrDjMkWb[oFjH~HbL{OfJtQxr@gJdQqIfJlSrn@tLzJx[rBzx@kRiGsIkf@wO}Omb@{FcYvUmSt^|AjQyyAGuU}F{_@fGdQwb@gAac@","IEEEEEFFDHEGDIEDFHDEGDEHEI","ar}vFjsqaMzh@qN~HbLnKgOsS}EsNpPgOwG{JxO","IEEHEEEI"],
    "301":['Greenwich Village/Financial District',"kxjwFh~vbMnSoJbd@vdA{DrTmRoBsd@g_@uB{Q~GgX","IFEHDFDI","{lzwFdzrbM|QtE~}A~jA`^rKtF{Enc@nFln@auBfh@dGjgAd]cJvVfc@b^bXs\\zn@heAr@hTwXjZap@eDii@qMUaSqeAaGqmB{O}@rIkt@_Zsm@ik@sXgJoVyV","IDFDDHGHFFGGEIFDFFBEGEDDI"],
    "302":['Lower East Side/Chinatown', "aqqwFjunbMvp@~Gzh@jOtQb[`Btt@_INhLraAcXr\\gc@c^bJwVmmBqk@~j@ogB","IDFHEEFIFFHI"],
    "303":['Chelsea/Clinton/Midtown', "mrywFtgqbMzCoW|\\{fApq@|d@`MvNmEnN~YxRnG{RnkAdv@t@dF}j@hnBoc@oFuFzEa^sK_~A_kAwMyBfUkt@","ICHEEEFFHCIDDFDGI"],
    "304":['Stuyvesant Town/Turtle Bay',"e_wwF|slbMtjAh~@lp@r@rExKtXeO`PxAqn@vnBeDMokAev@oGzR_ZyRlEoNaMwNqq@}d@f\\ufAdRhS","IGEEDHICFFEEEHFI"],
    "305":['Upper West Side',"{n_xFnrlbMoKsSzVyv@bjEvtCeTjr@fA|Ek\\|eAub@_M_r@og@y]qPyhD_~BpL_Hvr@zf@r`@~QdUkt@","IEHHDCIECCHECGI","ck}wFlilbMxCr]vPlCfMsXgUiOqMzE","IEGFEI"],
    "306":['Upper East Side',"_gvwF`glbMqKj@qxB{iBoCyMhQHhMvQbhAb{@z_@bh@","IEDIEDDI","}twwFh}kbMpAhA_e@d{AirCukBh_@ukAv]oGb]bK~TtXpbAp|@","ICHIFHECI"],
    "307":['Morningside Heights/Hamilton Heights',"{|cxFthibMb@xHjm@bV`ZlVaChHb[nSz]_@bOzJyXb}@s`@_Rwr@{f@gIRojAoaAkZmC~XkaAts@jc@","IDEEDFDGICDEEHGI"],
    "308":['Central Harlem', "ijdxF~egbM~b@Phj@l^nGcSdVnP_Cfc@tRh@bg@b\\eZx_AqZ_Gc[oS`CiHaZmVkm@cVyKiS_h@{XyPN|@yUbv@_G","IEFEHFDGIDEEDEEDHFI"],
    "309":['East Harlem', "on~wF~ncbM~Wja@rb@vQ~S|V_Pns@oOzCeb@ec@k^{RwV@aGmW|U_k@hZ_I","IDDGIEDEHEFI","q|`xF~wfbMvk@}QtVzAtRje@`g@fZ~OzWi_@tkA}~AeeAuRi@~Bgc@ma@oZd`@{N","IEGEHFIEGFGI"],
    "310":['Washington Heights/Inwood',"{jnxFj}dbM~HaIaGmQ`Fcf@`[}@~b@jYtk@lg@rw@hg@teAxi@j_@`_@cUzw@jZlCnjAnaAqDhI}OcTewA}w@oz@cWgd@`E_HyLoo@ah@qk@w^}SeCuo@ce@pCcWjOk@","IEDFHCDCDGGEEIDFEGCEDDGEI"],
    "101":['Mott Haven/Hunts Point',"agexF`t_bMfJcBeBwj@|TwBf@gOnUsIbV{YbLsg@~k@oUha@bVsIbt@|Ej\\_]v`@nA~dAxh@zc@hObVkCzYk\\rg@?r]ic@b[}HcQ_NnPoFgJw`@cQtBkMyOwLeVsb@jMg^aBgJnKku@oKjCka@{ES_b@","IEFEEDEGFIEFEGDGEEFIEFDFEDGDDGDFI"],
    "102":['Morrisania/East Tremont', "y`oxF|zzaMhR_D`v@Sfw@~Cns@{OzYf@p]b`@nKg@jRfh@h^rXfh@vBg@fO}TvBdBvj@gJbBR~a@ja@zEnKkCeQb|AiMsD~H_Xgh@kCiw@c`@q]{@lA{TeaAwe@ma@kWqIRw`@sq@rD_DcVgh@sq@o_@","ICDEDHEEEFIEEEFFDGIEFDEFFCDGDDFI"],
    "103":['Highbridge/S. Concourse', "iqhxFt~dbMA{c@pKk\\`Bwj@bQz@hw@b`@fh@jC_I~Wz^~k@xOvLuBjMv`@bQwBbG_b@cBgi@`DuM}EiWnFqd@gJgm@sb@xBkH","IDDFHEGFDEEIDCDDGEEI"],
    "104":['University Heights/Fordham', "a~kxFdp`bMg@wQ~RzJnFsSzTSdaAve@mAzTlK?aBvj@qKj\\bBnd@{EvGfm@rb@pd@fJhWoFtM|Efi@aDfm@fE~MoP|HbQalDbG{|@s]qjBovAvVkz@}WwVnA{E","IFEEGHEEDDDGHEDDDFFIFHGFDI"],
    "105":['Kingsbridge Heights/Mosholu', "a`pxFxd|aMfTwQ{@wVn_@jH~\\vVbVfh@sD~CrNb`@nd@r]wBz^_S{Jg@rX|WvVqDvQ{Tz^sXcQgYkCoFk\\|WkMhO{r@gc@od@oFvG_b@wVka@nFrI_b@kCoU","IEFGEDDEHFFEFDIDFGEGFEEGDI"],
    "106":['Riverdale/Kingsbridge', "ippxFlb`bM~HccAja@oF~a@vVnFwGfc@nd@iOzr@}WjMlFfYwMbLyNzw@gN|\\ex@a[i`Dku@cGsDrXovAzr@{@rSrDbo@It`@xPdB_N","IFHEEHEEEDDIDCIHCCEEI","}enxFhf`bMer@ax@rCvi@ti@nVzBeH","IHFEI"],
    "107":['Soundview/Parkchester',"o`hxF`|vaMtXgc@wLy[be@qD~WbVdaAwQfYfYvLnA`b@n_@bQv[cB`V}^|ESbt@kWlUoK`g@eh@vj@gh@wBi^sX}\\o}@gJkf@}E{pA","IFGEFHCDEIEEFEDIEGDEI"],
    "108":['Throgs Neck/Co-op City', "{{ixFnijaMnd@mZpA`Gvj@}HnKfOwy@`j@qd@_]","IFEEHGI","ejjxFxwfaMlKf^ym@}@eBsIx`@sb@vB|O","IFGEFI","qdoxF`claMj\\`LSfJjf@tb@pNcQwj@k\\iCoPwe@kHx@wj@x`@wLzTS~Mpg@`j@`IpZfOfJvVxOaDzYhO{h@ja@m_@bBgYhp@oKlMcL_IsDb`@kHnKuyAsNsIed@dBwk@rSgpAvVpK","IEDFHEEHFDHFEEEEIEFCFEDIHDEFI","}bmxFpeqaMjp@kRqAsS|OR~HlU`QaLfr@gEzJjHt]kMz@bGxm@_D|T_NnUrDcGsg@n_@mHh\\yh@hObQ~Mz@~R}r@nAuQpNjCiClPmWxj@z@rNyYrg@aD|f@lR`tAja@lFkCja@od@hTo_@g@_]kHug@zTgO{@aVoPce@pD`B}M{pA{Oao@oi@gm@|\\jChOgw@nUsNjWa]{w@uVw~@bLwQbQS~u@`Qv`@iM","IFFEFEEEEEEEHGEFDFCEICDDGEFGFIDFEDEGEFHEEEIDHFDEI"],
    "109":['Pelham Parkway', "ysmxFbkvaMj_AmyB`o@ni@zpAzOoAnZdLfOuXfc@|EzpAfJjf@o_@sI{Yg@os@zO{uAwBd@guAcQSdQqs@","IHFIEFFDIDEEHFFI"],
    "110":['Williamsbridge/Baychester',"m~txFni~aM~o@mfDoKoZcLSkMkk@rSwt@v[kMb`@_DzY_~A_G]|Z_{@tDhg@oKjWtVv~@`]zw@rNkWfw@oUkCiOve@eOc~@zxB}Jjf@bQRe@fuAgh@gEkM~Hz@vVoZfkAeLbrAu`@yPco@HsSsD{r@z@jNuq@","IGEEGFDGEEIEFDHEEEHDGFIEGDDHECCGI"],
    "201":['Williamsburg/Greenpoint', "_{rwFjzibMuJ{Tpi@ij@dJsp@`y@g\\bV_@dJ}NvT{ApIv`Acc@dOfOxw@xf@uEa@yItWpDqQh_@jPvYcMzNpMtUfJ{AzD|b@wKgCi]nc@cZhMqm@eMgr@wd@iv@hE}SaSoL}\\hOsq@vM`E","IFEGDEDIFGGEEGEEFEEIEDGEFHDGEI"],
    "204":['Bushwick', "kymwFlzfbMbDeAqIw`Are@yz@hUuAxXak@dItGhLcVbYyBdd@m\\bObWR|T}`AnlBmy@rgBzBt`@_MvAiBkWaVfB`@xIyf@tEgOyw@~]_M","IDFGEEEEEIDFCFHEFEDGFI"],
    "203":['Bedford Stuyvesant',"amlwFx|hbM`ShD{Bu`@xgA{_Cxu@iG_Af^c[nFpBzjAxRsBcFnuBgh@xGbBz]yUzCgBm^eVzC|AjXuY`D}BcXgJzAqMuUbM{NkPwYdMyW","IFFGIFFFFIFFFFFEHEEFEEI"],
    "202":['Brooklyn Heights/Fort Greene', "gzlwF|tnbM{Y~MwG_NnZwL_@}Mh]oc@nd@sJ}AkXdV{CfBl^xU{CcB{]xj@mHvEtKcZ|`CyGhLja@tUg_@pqAi_@uNkKnk@tc@|P{TrJkdAkf@iXaRwEcwArBsWpTmMoKcL","IEGEEEFGFFFFIEDGGGGFFICGFEEI"],
    "206":['Park Slope/Carroll Gardens', "i`iwFtsobMbEqUn]~MlLki@pR{A~Fqf@js@oIxCfLjn@_GhIpY|LoHtOpi@g_ArQuUfp@nRlPwTdUdKvKoVrf@sOoIsYvRq\\aZ|AeR{_@kU`Hmb@ka@uUlDkC","IFFEEFHEFEEIGFEEGFEIEEEFDI","gpdwFvpmbMhm@l[}Lyf@k_@jJ","IGFI","{kiwFl}rbMfGzBdReo@ja@vWyAhRnn@ve@rDzYwRrEhd@~c@jG~ZgErOec@xLY{Fhe@eMcHg^uZaBiVph@kPfI{PkCkNye@hIsDsSiYiPq@nDqb@uc@}PjKok@`WxJ","IEGGEFEFFDIGDGFGFDHEFEFFGFI"],
    "208":['North Crown Heights/Prospect Heights',"w{hwFzefbMJ{f@|_@oFbcAdFrKzb@}Abs@aOQcCbdAqDO{Abn@mP~tAqRzAmLji@o]_NjWisBiHaKbFouByRrB}B_c@","IFGFHEEDDDFEIFFEFFI"],
    "216":['Brownsville/Ocean Hill', "_~gwF`gabMhJeTtQiCeDib@rV}Dq@sJzm@qEmMah@tKuHbd@hyArC`ZtKnPfC`\\_EvY}^dc@~BbKya@td@gIkU}gAeF~@g^}s@nDds@utA","IEFFEEFEIDDDHEEEIFFFHI"],
    "205":['East New York/Starret City',"y_iwFf`zaMz_@_Zno@uJoA}Odq@sKhBdPlO{BrIdc@fr@md@n\\bDlFv_@qC~JxExj@fX}JnXnZgOfUgLKkQlf@in@bq@yBbRv^xq@y]f`@aQsGgCa\\uKoPsCaZcd@iyAuKtHlM`h@{m@pEp@rJsV|DdDhb@c`@xE_DuQu^yTlJgHck@{cAqW}k@iFa^peAoP","IEEEGEEGEICDGFHEEEGEFIEDDDHEFEEFHFEHECDHI"],
    "218":['Flatlands/Canarsie', "oxuvFrcfbMfCiP}FwlAtY_L_Hd`CgRuAfDmQ","IDFHFEI",
	   "w{vvFnryaM|R}HrN~Czc@rb@mZfJ{h@zEqKcLlHub@","IDFHCGEI",
	   "obxvFdhwaM~Hr]s]fm@kMwVvQu{@fOpF","IFHFFI",
	   "ou{vFrtwaMrDa`@f^z@~W|\\sb@|YgYuX","IGEGFI",
	   "ka|vFdluaMhRjHrI{TeE}Obt@rNlKrb@}Rd[kMqUiTpAm_@gJg@wQ","IFEGFHGEDEI",
	   "_b|vFzyzaMrIhr@_q@_Sm\\_v@`NqKhk@dGlH`[","IGFHEFI",
	   "oj~vF~fvaMfOQdTwVxV~sA`L`[qg@@s]{^|Cgc@aGuS","IEGCHFGDI",
	   "m{~vFfbtaMjk@l\\ka@dTeJeJyGa]~HkH","IGGDEI",
	   "i}~vF~fvaM|JpF{@z|@c[kMsX_v@rIcVjW|HtGbL","IEHEGFDI",
	   "{|awF`o~aM|j@mm@i@wRb^cAnPhK~j@d}@vV~IrAh]{Ub\\wj@v|AxDnAlPyc@t_@io@~Qif@~jAiy@vJtbAwJtTdShBoHdm@rNyBT`UwRdXqYaMzJ|f@hg@ci@k@gyAkMc~Ab|A}n@je@?zYtV`Eho@cEnIzLhk@uVpVoWBgNlKlJv{@uZwNoc@hWcUtYdCx`@sYr[bDrNxkAi`BxLyArIrQo`AthAcEmHc]b`@nBpDw]da@cH_MoHlJzDbYsi@|FmTpIk@mKy[bK{\\pCwAoReK`GoCev@cM`AoB_v@u[nBg@eT{Mi@y@m^_KJuj@ibAx]g`@w^yq@hXyg@","IEFHDEIEDDICCFIEEFEEGFGIGDIEHFDDIEDGGFDGEEHFEHEECDFFEHDDECIEEEEFFEEEEGFFI"],
    "217":['East Flatbush', "smdwFzrdbMJsO|^ec@y@_LlV_Ibm@dgA~JKx@l^zMh@f@dTt[oBnB~u@bMaAxBlo@yj@zBnAfs@kWdW}q@fFmAex@s[`BuGiiC}Q_IoVjZwJcZl]e`@","IEDEHEEEEFHDEGFFIFFGGFFGI"],
    "209":['South Crown Heights', "qrdwFh_fbMvHoJ|Q~HtGhiCr[aBlAdx@q_@tFpCbKkn@~FyCgLks@nIlHmm@zAcn@pDNbCcdA`OPhKoe@vL{N","IEFFFHEEEDICDDFEDI"],
    "207":['Sunset Park', "ivewF`csbMrOnInVsf@eKwKvTeUoRmPtUgp@pkA_UnHtWaBlR_MdAnAtVpNlf@r\\xl@_MtVtp@xq@hEuIbR|Z_Uvc@y[p_@eNdGlN`Nue@pj@w[kMmOub@kKhDqe@yj@tK{TmLcGoQs[eAil@}\\cV`EwM","IFFEEFGIEEEFDFGEDHDDEFIEEEGFDEEEI"],
    "210":['Bay Ridge', "yj`wFpjybMrGuKmNaNdNeGx[q_@~Twc@}K{Qlj@o|@hCfLnhBfmBnCuGpTp[Crw@gFlVu`Apm@g_@`Igx@}Ai}Aem@f[mo@`BbB","IEFDFEEIDEDIDGDHEGDI"],
    "212":['Borough Park', "m|awFrxobM~LeA`BmRoHuWz{@uOdNlJ~S`m@b]sD{Ba`@|[_MyA_Xn|@oJdPfHnEh|@mWjCcj@xfAsB_Cmh@rdAvHrAmj@n|@oKr@up@yq@~LuVs\\yl@qNmf@oAuV","IEDGGDGFEFGEIGFDCEDIEGFEDI"],
    "214":['Flatbush', "qc`wFv_kbMw@et@tw@eDvAnRz\\qCx[cKj@lKxXsCxHxZlN}ApGvlAglAxMxA~W}[~LzB``@c]rD_Tam@eNmJehA`SuOqi@}LnH{Mue@nrA}MrVgV","IGFECEEHEFIGFEFHDGGEFHEI"],
    "215":['Sheepshead Bay/Gravesend', "yszvFfcibMrKmGmKyQnHmJbH~Lv]ea@oBqDb]c`@bElHhdAwlAvDjo@qYvS`@rPld@rC{Cb{@pN`Oe@_iAb^eBpKvX}Bfz@nDji@{u@zJy@be@gq@tBpF|_AevA|Em[fD_OapCmN|AeMw`@pc@yE","IEEFFDCEEIFEGFEHFGEDIFFGGCIFEGI"],
    "211":['Bensonhurst', "kk}vF|srbM|Xgj@rB~Bbj@yfAjs@eOj]hC|KqGpEtv@rLaBgAxd@jTbUzF|QsPrJkc@rj@zFfGc^hw@sJ`i@cQaQoCtGohBgmBfEoIiSkDnNkY","IDCGEDIEEEDIDFEDIEEEEFI"],
    "213":['Coney Island', "yiuvF`wpbM~@zJvUhS}KlSiVaAtC~\\cEjTie@wH{Spb@{c@~h@}Iv\\wBf^eF_GrJai@b^iw@{FgGjc@sj@rPsJ{F}QkTcUfAyd@sL`BqEuv@zj@uAqF}_Afq@uBx@ce@zu@{Jq@tn@fOnhBlHr{Aw@|aAkWh}@m[lAcLob@rMezBcX{Y","IDGEFDFFDECIDEEFDGDEEEHGFFFIDCFEIFFFI"]
};