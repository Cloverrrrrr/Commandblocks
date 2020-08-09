const shader=this.global.shaders.bittrium;
const customfx = this.global.fx;
const newSounds = this.global.newSounds;

const bitcrystal = extendContent(Block, "bitcrystal",{
  blockpos: {},
  blockcount: [],
  checked: [],
  lastCosts: [],
  lastProgs: [],
  hasLast: false,
  bittrium: null,
  draw(tile){
    this.super$draw(tile);
    Draw.shader(shader);
    Draw.rect(this.animRegion, tile.drawx(), tile.drawy());
    Draw.shader();
  },
  load(){
    this.super$load();
    this.region = Core.atlas.find(this.name);
    this.animRegion = Core.atlas.find(this.name+"-anim");

    Events.on(EventType.WorldLoadEvent, run(event => {
      bitcrystal.hasLast = false;
			bitcrystal.blockpos = {};
      bitcrystal.blockcount = [];
      bitcrystal.checked = [];
		}));
  },
  shouldActiveSound(tile){
    //return tile.ent().items.total()>0;
  },
  /*
  drawLight(tile){

    if(tile.ent().items.total() <= 0) return;
    this.color1 = Pal.lightFlame;
    var index = fireitem.indexOf(tile.ent().items.first().name);
    if(index > -1){
      this.color1 = firecolor[index];
    }
    Vars.renderer.lights.add(tile.drawx(), tile.drawy(), 170+10*Mathf.random(), this.color1, (tile.ent().items.total()>0)?0.9:0);

  },
  */
  hasWave(){
    return Vars.state.rules.waves && Vars.state.rules.waveTimer && !Vars.state.rules.pvp && !Vars.state.rules.attackMode && !Vars.state.rules.infiniteResources && !Vars.state.rules.editor;
  },
  placed(tile){
    //hmm
  },
  removed(tile){
    if(!tile.ent().parent()){
      this.lastProgs = tile.ent().getProgArr();
      this.lastCosts = tile.ent().getCostArr();
      this.hasLast = true;
    }
		if(this.blockpos[tile.getTeamID()] == tile.pos()){
			delete this.blockpos[tile.getTeamID()];
		}
    if(this.checkpos[tile.pos()]){
      this.checkpos[tile.pos()] = false;
      this.blockcount[tile.getTeamID()]--;
    }
		this.super$removed(tile);
	},
  handleDamage(tile, amount){
    if(this.blockcount[tile.getTeamID()] <= 1) return 0;
    return this.super$handleDamage(tile, amount);
  },
  handleBulletHit(entity, bullet){
    if(this.blockcount[tile.getTeamID()] <= 1) entity.damage(0);
    else this.super$handleBulletHit(entity, bullet);
  },
  canBreak(tile){
		return this.super$canBreak(tile)&&this.blockcount[tile.getTeamID()]>1;
	},
  update(tile){
		this.super$update(tile);
		var ent = tile.ent();
    if(ent.parentTile() == null && this.blockpos[tile.getTeamID()] != tile.pos() && this.hasLast && !(tile.getTeamID() in this.blockpos)){
      this.blockpos[tile.getTeamID()] = tile.pos();
      ent.setProgArr(this.lastProgs);
      ent.setCostArr(this.lastCosts);
    }
    if(ent.parentTile() == null && this.blockpos[tile.getTeamID()] != tile.pos()) ent.setParent(this.blockpos[tile.getTeamID()]);
		if(ent.parentTile() == null && !ent.isValidated()){
			ent.validate();
			if(tile.getTeamID() in this.blockpos) ent.setParent(this.blockpos[tile.getTeamID()]);
			else this.blockpos[tile.getTeamID()] = tile.pos();
		}
    if(!this.checkpos[tile.pos()]){
      this.checkpos[tile.pos()] = true;
      if(this.blockcount[tile.getTeamID()] == null) this.blockcount[tile.getTeamID()] = 0;
      this.blockcount[tile.getTeamID()]++;
    }

    if(this.bittrium == null || this.bittrium.name != "commandblocks-bittrium") this.bittrium =  Vars.content.getByName(ContentType.item, "commandblocks-bittrium");
    var pent = tile.ent();
    if(tile.ent().parentTile() != null) pent = tile.ent().parentTile().ent();
    if(pent.getProg(tile.ent().getItemID()) >= pent.getCostPow(tile.ent().getItemID())){
      pent.addProg(tile.ent().getItemID(), -1*pent.getCostPow(tile.ent().getItemID()));
      pent.incCost(tile.ent().getItemID());
      this.offloadNear(tile, this.bittrium);
    }

    this.tryDump(tile, this.bittrium);
	},

  setBars(){
    this.super$setBars();
    this.bars.add(
      "itemcount", func(entity => {
        var pent = entity;
        if(entity.parentTile() != null) pent = entity.parentTile().entity;
        return new Bar(
          prov(() => pent.getProg(entity.getItemID()) + "/" + pent.getCostPow(entity.getItemID())),
          prov(() => (entity.getItem() == null)?Color.white:entity.getItem().color),
          floatp(() => {
            return pent.getProg(entity.getItemID())/pent.getCostPow(entity.getItemID());
          })
        )
      })
    );
  },

  getMaximumAccepted(tile, item){
    return 1024;//I CAN DO ANYTHING!
  },
  handleStack(item, amount, tile, source){
    var pent = tile.ent();
    if(tile.ent().parentTile() != null) pent = tile.ent().parentTile().ent();
    pent.setItemID(item.id);
    pent.addProg(item.id, amount);
  },
  handleItem(item, tile, source){
    var pent = tile.ent();
    if(tile.ent().parentTile() != null) pent = tile.ent().parentTile().ent();
    pent.setItemID(item.id);
    pent.incProg(item.id);
  },
  acceptItem(item, tile, source){
    return item.name != "commandblocks-bittrium";
  }
});

coremainbuild.entityType = prov(() => extend(TileEntity , {
	//to reduce checks
	_validated: false,
	isValidated(){
		return this._validated;
	},
	validate(){
		this._validated = true;
	},
	_parent: -1,
	parent(){
		return this._parent;
	},
  parentTile(){
    if(this._parent == -1) return null;
    var rtile = Vars.world.tile(this._parent);
    if(rtile.block() != bitcrystal) return null;
    return rtile;
  },
	setParent(p){
		this._parent = p;
	},
  _itemID: 0,
  _itemCosts: [],
  _itemProgs: [],

  getProg(id){
    if(!this._itemProgs[id]) return 0;
		return this._itemProgs[id];
	},
	incProg(id){
    if(!this._itemProgs[id]) this._itemProgs[id] = 0;
		this._itemProgs[id] += 1;
	},
  addProg(id, a){
    if(!this._itemProgs[id]) this._itemProgs[id] = 0;
		this._itemProgs[id] += a;
	},
  setProg(id, a){
		this._itemProgs[id] = a;
	},
  getCost(id){
    if(!this._itemCosts[id]) return 0;
		return this._itemCosts[id];
	},
  getCostPow(id){
    if(!this._itemCosts[id]) return 1;
		return Mathf.pow(2, this._itemCosts[id]);
	},
	incCost(id){
    if(!this._itemCosts[id]) this._itemCosts[id] = 0;
		this._itemCosts[id] += 1;
	},
  setCost(id, a){
		this._itemCosts[id] = a;
	},

  getItemID(){
    return this._itemID;
  },
  setItemID(id){
    if(id < 0) id = 0;
    this._itemID = id;
  },
  getItem(){
    return Vars.content.getByID(ContentType.item, this._itemID);
    //can be null
  },
  getProgArr(){
    return this._itemProgs;
  },
  setProgArr(arr){
    this._itemProgs = arr;
  },
  getCostArr(){
    return this._itemCosts;
  },
  setCostArr(arr){
    this._itemCosts = arr;
  },

	write(stream){
		this.super$write(stream);
		stream.writeIntn(this._parent);
    stream.writeShort(this._itemID);
	},
	read(stream,revision){
		this.super$read(stream,revision);
		this._parent = stream.readInt();
    this._itemID = stream.readShort();
	}
}));