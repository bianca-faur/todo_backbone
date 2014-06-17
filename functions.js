$(function() {
    var TodoItem = Backbone.Model.extend({
        defaults: {
            text: "",
            done: false
        },

        toggleStatus: function() {
            this.save({done: !this.get("done")});
        }
    });

// -------------------------------------------------------- COLLECTION -------------------------------------------------- //
    var TodoItems = Backbone.Collection.extend({
        model: TodoItem,

        localStorage: new Backbone.LocalStorage("stickyNotes"),

        getOrder: function() {
            if (this.length) {
                return this.last().get('order') + 1;
            } else {
                return 1;
            }
        },

        done: function() {
            return this.where({done: true});
        },

        to_do: function() {
            return this.where({done: false});
        },

        comparator: function(todo) {
            return todo.get('order');
        }
    });

    var todos = new TodoItems();
// -------------------------------------------------------- TASK VIEW -------------------------------------------------- //
    var TodoView = Backbone.View.extend({
        className: 'task',

        template: _.template($('#task-template').html()),

        events: {
            'click .checkStatus' : 'toggleStatus',
            'dblclick .text' : 'editable',
            'keypress .text' : 'updateSticky',
            'click .pin' : 'deleteSticky',
        },

        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);
            this.listenTo(this.model, 'visible', this.toggleVisible);
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));

            this.$el.toggleClass( 'completed', this.model.get('done') );
            this.toggleVisible(); 

            return this;
        },

        toggleVisible : function () {
            this.$el.toggleClass( 'hidden',  this.isHidden());
        },

        isHidden : function () {
            var isDone = this.model.get('done');
            return (
                (!isDone && TodoFilter === 'done')|| (isDone && TodoFilter === 'todo')
              );
        },

        toggleStatus: function() {
            this.model.toggleStatus();
        },

        editable: function() {
            this.$('.text').attr('contenteditable', true);
        },

        updateSticky: function(e) {
            var note = this.$('.text').text();
            if (e.keyCode == 13) {
                this.model.save({text: note});               
            };
        },

        deleteSticky: function() {
            var conf = confirm("Are you sure you want tot delete this note?");
            if(conf) {
                this.model.destroy();
            }
        }

    });
// -------------------------------------------------------- GENERAL VIEW -------------------------------------------------- //
    var GeneralView = Backbone.View.extend({
        el: $('#content'),

        events: {
            'click #add_button' : 'addNewSticky',
            'click #del_all' : 'deleteAllFiltered',
        },

        initialize: function() {
            this.$all = this.$('#categories #all a span');
            this.$to_do = this.$('#categories #to_do a span');
            this.$done = this.$('#categories #done a span');

            this.listenTo(todos, 'add', this.addStickyToDOM);
            this.listenTo(todos, 'all', this.render);
            this.listenTo(todos, 'change:done', this.filterOne);
            this.listenTo(todos,'filter', this.filterAll);

            todos.fetch();
        },

        render: function() {
            var all = todos.length;
            var todo = todos.to_do().length;
            var done = todos.done().length;

            this.$all.text("(" + all + ")");
            this.$to_do.text("(" + todo + ")");
            this.$done.text("(" + done + ")");

            this.$('#categories div a').filter('[href="#/' + ( TodoFilter || '' ) + '"]')
        },

        addNewSticky: function() {
            todos.create(this.attrs());
        },

        attrs: function() {
            return {
                text: '',
                done: false,
                order: todos.getOrder(),
            };
        },

        addStickyToDOM: function( todoItem ) {
            var view = new TodoView({model: todoItem});
            $('#tasks').append(view.render().el);
        },

        deleteAllFiltered: function() {
            var conf = confirm("Are you sure you want to delete filtered stickies?");
            if(conf) {
                switch(TodoFilter) {
                    case "todo":
                        _.invoke(todos.to_do(), 'destroy');
                        break;
                    case "done":
                        _.invoke(todos.done(), 'destroy');
                        break;
                    default:
                        var model;
                        while (model = todos.first()) {
                            model.destroy();
                        }
                }
            };

        },

        filterOne : function (todo) {
            todo.trigger('visible');
        },

        filterAll : function () {
            todos.each(this.filterOne, this);
        }
    });

    var appView = new GeneralView();
    appView.render();

    var TodoRouter = Backbone.Router.extend({
        routes:{
            '*filter': 'setFilter'
        },

        setFilter: function(param) {
            if (param) {
                param = param.trim();
        };

        TodoFilter = param || '';
        todos.trigger('filter');
    }
    });

    var router = new TodoRouter();
    Backbone.history.start();
    var TodoFilter = Backbone.history.fragment;
});