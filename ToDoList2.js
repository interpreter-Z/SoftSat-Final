//Config Firebase ==============================================================
firebase.initializeApp({
  apiKey: "AIzaSyC4z6PxCKNjApGYSFM5wbo6e0aiHuuM3ZM",
  authDomain: "ssfp-todolist.firebaseapp.com",
  databaseURL: "https://ssfp-todolist-default-rtdb.firebaseio.com",
  projectId: "ssfp-todolist",
  storageBucket: "ssfp-todolist.appspot.com",
  messagingSenderId: "684797675310",
  appId: "1:684797675310:web:cb8bfbdae473f6e2e6dcbf"
});

//Define Vue Components ========================================================
Vue.component('todo-item', {
  props: ['tsp', 'title', 'detail', 'active', 'dispdtl', 'isedit'],
  template: `
    <div class="todo-item">
      <button v-on:click="$emit('deactivate',tsp)" v-if="active" >O</button>
      <button v-on:click="$emit('activate',tsp)"   v-if="!active">R</button>
      <button v-on:click="$emit('tggdtl',tsp)"     v-if="!isedit && active"  class="todo-text ttl"   >{{title}}</button>
      <button v-on:click="$emit('tggdtl',tsp)"     v-if="!isedit && !active" class="todo-text ttl ina">{{title}}</button>
      <input  v-if="isedit" v-bind:value=title @input="$emit('edtttl', $event.target.value)">
      <button v-on:click="$emit('remove',tsp)"     >X</button>
      <div v-if="dispdtl || isedit">
        <span   v-if="!isedit" class="todo-text dtl">{{detail}}</span>
        <input  v-if="isedit" v-bind:value=detail @input="$emit('edtdtl', $event.target.value)">
        <button v-on:click="$emit('tggedit', tsp)" v-if="!isedit" class="todo-text edt">edit</button>
        <button v-on:click="$emit('tggedit', tsp)" v-if="isedit"  class="todo-text edt">save</button>
      </div>
    </div>
  `,
  methods:{
    getTtlSty: function(){
      return "todo-text ttl"
    }
  }

});

//Define Vue Application =======================================================
const app1 = new Vue({
  el: "#todo-app",
  data:{
    //---database---
    database: firebase.database(),
    todolist: [
      //{tsp:"111", title:"title1", detail:"detail1", active:true, dispdtl:false, isedit:false},
      //{tsp:"222", title:"ttl2",   detail:"dtl2"   , active:true, dispdtl:false, isedit:false},
    ],  //active todo items
    todofnsh: [
      //{tsp:"333", title:"ttl3",   detail:"dddddtl3", active:false, dispdtl:false, isedit:false},
    ],  //finished todo items
    //---ui---
    iptTtl: "",
    iptDtl: "",
    edtTtl: "",
    edtDtl: "",
  },
  methods:{
    //===== UTILITY =====
    //return index of etr with specified tsp in list lst; return -1 if not found
    indexOfEtr: function(lst, tsp){
      for(let i=0; i<lst.length; i++)
        if(lst[i].tsp == tsp)
          return i;
      return -1;
    },
    //return etr with specified tsp in list lst; return null if not found
    fetchEtr: function(lst, tsp){
      let idx = this.indexOfEtr(lst, tsp);
      if(idx == -1) return null;
      return lst[idx];
    },
    //return etr with specified tsp; searches both todolist & todofnsh
    getEtr: function(tsp){
      //search todolist first
      let idx = this.indexOfEtr(this.todolist, tsp);
      if(idx != -1) return this.todolist[idx];
      //if not found, then search todofnsh
      idx = this.indexOfEtr(this.todofnsh, tsp);
      if(idx != -1) return this.todofnsh[idx];
      //not found in either
      return null;
    },
    addToDo: function(tsp, title, detail, active){
      //create new etr if valid
      if(title == "") return;
      let newToDo = {
        tsp: tsp,
        title: title,
        detail: detail,
        active: active,
        dispdtl: false,
        isedit: false,
      };
      //push new etr to correct list
      let lst = [];
      if(active)
        lst = this.todolist;
      else
        lst = this.todofnsh;
      lst.push(newToDo);
      //add new etr to database
      this.db_addEtr(tsp, title, detail, active);
      //clear user input when finished
      this.iptTtl = ""; this.iptDtl = "";
    },

    //===== HANDLER =====
    hdl_activate: function(tsp){  //set current todo as active
      //fetch specified entry
      let etr = this.fetchEtr(this.todofnsh, tsp);
      let idx = this.indexOfEtr(this.todofnsh, tsp);
      if(etr == null) return;
      //alter todo status and move it to correct list
      etr.active = true;
      this.todolist.push(etr);
      this.todofnsh.splice(idx,1);
      this.db_updateEtr(etr); //update etr in database
    },
    hdl_deactivate: function(tsp){  //set current todo as inactive (finished)
      let etr = this.fetchEtr(this.todolist, tsp);
      let idx = this.indexOfEtr(this.todolist, tsp);
      if(etr == null) return;
      etr.active = false;
      this.todofnsh.splice(0,0,etr);
      this.todolist.splice(idx,1);
      this.db_updateEtr(etr);
    },
    hdl_tggdtl: function(tsp){  //toggle detail display
      let etr = this.getEtr(tsp);
      if(etr == null) return;
      etr.dispdtl = !etr.dispdtl;
    },
    hdl_remove: function(tsp){  //remove todo from lists & database
      //remove from database
      this.db_removeEtr(tsp);
      let i = this.indexOfEtr(this.todolist, tsp);
      //try removing from todolist first
      if(i != -1){
        this.todolist.splice(i,1);
        return;
      }
      //then try removing from todofnsh
      i = this.indexOfEtr(this.todofnsh, tsp);
      if(i != -1) this.todofnsh.splice(i,1);
    },
    hdl_tggedit: function(tsp){   //start/finish editing todo entry
      let etr = this.getEtr(tsp);
      if(etr.isedit){ //finish & save user edits
        if(this.edtTtl == "") return; //do not allow save if title is empty
        etr.title = this.edtTtl;
        etr.detail = this.edtDtl;
        etr.isedit = false;
        this.db_updateEtr(etr);   //update etr in database
        this.edtTtl = ""; this.edtDtl = "";
      }
      else{ //start user edit
        this.edtTtl = etr.title;
        this.edtDtl = etr.detail;
        etr.isedit = true;
      }
    },
    //sync user edit with app's ui variable
    hdl_edtttl: function(ipt){this.edtTtl = ipt;},
    hdl_edtdtl: function(ipt){this.edtDtl = ipt;},

    //===== DATABASE =====
    db_addEtr: function(tsp, title, detail, active){
      let ref = this.database.ref('/' + tsp);
      ref.set({title:title, detail:detail, active:active});
    },
    db_removeEtr: function(tsp){
      this.database.ref('/'+tsp).remove();
    },
    db_updateEtr: function(etr){
      let ref = this.database.ref('/' + etr.tsp);
      ref.update({title:etr.title, detail:etr.detail, active:etr.active});
    },
  },

  mounted: function(){
    this.database.ref('/').once('value').then(snap => {
      let db = snap.val();
      for(let tsp in db){
        this.addToDo(tsp, db[tsp].title, db[tsp].detail, db[tsp].active);
      }
    });
  },
});
